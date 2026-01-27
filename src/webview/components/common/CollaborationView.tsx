import React, { FC, useState, useEffect, useCallback, useMemo } from 'react';
import { getVsCodeApi } from '../../utils/vscodeApi';
import { isLightTheme } from '../../utils/themeColors';

interface Message {
	id: string;
	userId: string;
	userStoryId: string;
	content: string;
	status: 'open' | 'resolved' | 'archived';
	createdAt: string;
	updatedAt: string;
	user?: {
		displayName: string;
		rallyUserId: string;
	};
	replies?: MessageReply[];
}

interface MessageReply {
	id: string;
	messageId: string;
	userId: string;
	content: string;
	createdAt: string;
	user?: {
		displayName: string;
		rallyUserId: string;
	};
}

interface Notification {
	id: string;
	userId: string;
	messageId?: string;
	type: 'new_message' | 'reply' | 'resolved';
	read: boolean;
	createdAt: string;
	message?: {
		id: string;
		userStoryId: string;
		content: string;
		user?: {
			displayName: string;
		};
	};
}

interface CollaborationViewProps {
	selectedUserStoryId?: string | null;
}

const CollaborationView: FC<CollaborationViewProps> = ({ selectedUserStoryId }) => {
	const vscode = useMemo(() => getVsCodeApi(), []);
	const [messages, setMessages] = useState<Message[]>([]);
	const [messagesLoading, setMessagesLoading] = useState(false);
	const [messagesError, setMessagesError] = useState<string | null>(null);
	const [notifications, setNotifications] = useState<Notification[]>([]);
	const [unreadCount, setUnreadCount] = useState(0);
	const [selectedUserStoryFilter, setSelectedUserStoryFilter] = useState<string | null>(selectedUserStoryId || null);
	const [newMessageContent, setNewMessageContent] = useState('');
	const [newMessageUserStoryId, setNewMessageUserStoryId] = useState('');
	const [expandedMessages, setExpandedMessages] = useState<Set<string>>(new Set());
	const [replyContents, setReplyContents] = useState<Map<string, string>>(new Map());

	const sendMessage = useCallback(
		(message: Record<string, unknown>) => {
			if (!vscode) return;
			vscode.postMessage(message);
		},
		[vscode]
	);

	const loadMessages = useCallback(
		(userStoryId: string | null) => {
			if (!userStoryId) {
				setMessages([]);
				return;
			}

			setMessagesLoading(true);
			setMessagesError(null);
			sendMessage({
				command: 'loadCollaborationMessages',
				userStoryId
			});
		},
		[sendMessage]
	);

	const loadNotifications = useCallback(() => {
		sendMessage({
			command: 'loadCollaborationNotifications'
		});
	}, [sendMessage]);

	const createMessage = useCallback(() => {
		if (!newMessageContent.trim() || !newMessageUserStoryId.trim()) {
			return;
		}

		sendMessage({
			command: 'createCollaborationMessage',
			userStoryId: newMessageUserStoryId,
			content: newMessageContent.trim()
		});

		setNewMessageContent('');
		setNewMessageUserStoryId('');
	}, [newMessageContent, newMessageUserStoryId, sendMessage]);

	const createReply = useCallback(
		(messageId: string) => {
			const replyContent = replyContents.get(messageId);
			if (!replyContent || !replyContent.trim()) {
				return;
			}

			sendMessage({
				command: 'createCollaborationMessageReply',
				messageId,
				content: replyContent.trim()
			});

			const newReplyContents = new Map(replyContents);
			newReplyContents.delete(messageId);
			setReplyContents(newReplyContents);
		},
		[replyContents, sendMessage]
	);

	const markNotificationAsRead = useCallback(
		(notificationId: string) => {
			sendMessage({
				command: 'markCollaborationNotificationAsRead',
				notificationId
			});
		},
		[sendMessage]
	);

	const markAllNotificationsAsRead = useCallback(() => {
		sendMessage({
			command: 'markAllCollaborationNotificationsAsRead'
		});
	}, [sendMessage]);

	const toggleMessageExpanded = useCallback((messageId: string) => {
		setExpandedMessages(prev => {
			const next = new Set(prev);
			if (next.has(messageId)) {
				next.delete(messageId);
			} else {
				next.add(messageId);
			}
			return next;
		});
	}, []);

	useEffect(() => {
		if (selectedUserStoryId) {
			setSelectedUserStoryFilter(selectedUserStoryId);
			loadMessages(selectedUserStoryId);
		}
	}, [selectedUserStoryId, loadMessages]);

	useEffect(() => {
		loadNotifications();
		const interval = setInterval(loadNotifications, 30000); // Refresh every 30 seconds
		return () => clearInterval(interval);
	}, [loadNotifications]);

	useEffect(() => {
		const handleMessage = (event: MessageEvent) => {
			const message = event.data;

			switch (message.command) {
				case 'collaborationMessagesLoaded':
					setMessages(message.messages || []);
					setMessagesLoading(false);
					break;

				case 'collaborationMessagesError':
					setMessagesError(message.error || 'Failed to load messages');
					setMessagesLoading(false);
					break;

				case 'collaborationNotificationsLoaded':
					setNotifications(message.notifications || []);
					setUnreadCount(message.unreadCount || 0);
					break;

				case 'collaborationMessageCreated':
					if (message.message) {
						setMessages(prev => [message.message, ...prev]);
						loadMessages(selectedUserStoryFilter);
					}
					break;

				case 'collaborationMessageReplyCreated':
					if (message.reply) {
						setMessages(prev =>
							prev.map(msg =>
								msg.id === message.reply.messageId
									? { ...msg, replies: [...(msg.replies || []), message.reply] }
									: msg
							)
						);
					}
					break;

				case 'collaborationNotificationMarkedAsRead':
					setNotifications(prev =>
						prev.map(notif =>
							notif.id === message.notificationId ? { ...notif, read: true } : notif
						)
					);
					setUnreadCount(prev => Math.max(0, prev - 1));
					break;

				case 'collaborationNotificationsMarkedAsRead':
					setNotifications(prev => prev.map(notif => ({ ...notif, read: true })));
					setUnreadCount(0);
					break;

				case 'collaborationNewMessage':
					if (message.message) {
						if (message.message.userStoryId === selectedUserStoryFilter) {
							setMessages(prev => [message.message, ...prev]);
						}
					}
					break;

				case 'collaborationNewNotification':
					if (message.notification) {
						setNotifications(prev => [message.notification, ...prev]);
						setUnreadCount(prev => prev + 1);
					}
					break;
			}
		};

		window.addEventListener('message', handleMessage);
		return () => window.removeEventListener('message', handleMessage);
	}, [selectedUserStoryFilter, loadMessages]);

	const filteredMessages = useMemo(() => {
		if (!selectedUserStoryFilter) {
			return messages;
		}
		return messages.filter(msg => msg.userStoryId === selectedUserStoryFilter);
	}, [messages, selectedUserStoryFilter]);

	const lightTheme = isLightTheme();

	return (
		<div
			style={{
				padding: '20px',
				height: '100%',
				overflow: 'auto'
			}}
		>
			<div
				style={{
					display: 'flex',
					justifyContent: 'space-between',
					alignItems: 'center',
					marginBottom: '20px'
				}}
			>
				<h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Collaboration</h2>
				{unreadCount > 0 && (
					<button
						onClick={markAllNotificationsAsRead}
						style={{
							padding: '6px 12px',
							borderRadius: '4px',
							border: 'none',
							backgroundColor: lightTheme ? '#007acc' : 'var(--vscode-button-background)',
							color: lightTheme ? '#fff' : 'var(--vscode-button-foreground)',
							cursor: 'pointer',
							fontSize: '12px'
						}}
					>
						Mark all as read ({unreadCount})
					</button>
				)}
			</div>

			{/* Notifications Section */}
			{notifications.length > 0 && (
				<div
					style={{
						marginBottom: '30px',
						padding: '16px',
						backgroundColor: lightTheme ? '#f5f5f5' : 'var(--vscode-editor-background)',
						borderRadius: '6px',
						border: `1px solid ${lightTheme ? '#ddd' : 'var(--vscode-panel-border)'}`
					}}
				>
					<h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>Notifications</h3>
					<div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
						{notifications.slice(0, 5).map(notif => (
							<div
								key={notif.id}
								onClick={() => !notif.read && markNotificationAsRead(notif.id)}
								style={{
									padding: '10px',
									backgroundColor: notif.read
										? 'transparent'
										: lightTheme
											? '#e3f2fd'
											: 'var(--vscode-list-activeSelectionBackground)',
									borderRadius: '4px',
									cursor: notif.read ? 'default' : 'pointer',
									fontSize: '12px'
								}}
							>
								<div style={{ fontWeight: notif.read ? 400 : 600 }}>
									{notif.type === 'new_message' && 'New message'}
									{notif.type === 'reply' && 'New reply'}
									{notif.type === 'resolved' && 'Message resolved'}
								</div>
								{notif.message && (
									<div style={{ marginTop: '4px', color: 'var(--vscode-descriptionForeground)' }}>
										{notif.message.content.substring(0, 100)}
										{notif.message.content.length > 100 ? '...' : ''}
									</div>
								)}
							</div>
						))}
					</div>
				</div>
			)}

			{/* Filter Section */}
			<div
				style={{
					marginBottom: '20px',
					padding: '12px',
					backgroundColor: lightTheme ? '#f5f5f5' : 'var(--vscode-editor-background)',
					borderRadius: '6px'
				}}
			>
				<label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>
					Filter by User Story ID:
				</label>
				<input
					type="text"
					value={selectedUserStoryFilter || ''}
					onChange={e => {
						const value = e.target.value.trim() || null;
						setSelectedUserStoryFilter(value);
						loadMessages(value);
					}}
					placeholder="Enter User Story ID (e.g., US123)"
					style={{
						width: '100%',
						padding: '8px',
						borderRadius: '4px',
						border: `1px solid ${lightTheme ? '#ddd' : 'var(--vscode-input-border)'}`,
						backgroundColor: lightTheme ? '#fff' : 'var(--vscode-input-background)',
						color: 'var(--vscode-input-foreground)',
						fontSize: '12px'
					}}
				/>
			</div>

			{/* Create New Message Section */}
			<div
				style={{
					marginBottom: '30px',
					padding: '16px',
					backgroundColor: lightTheme ? '#f5f5f5' : 'var(--vscode-editor-background)',
					borderRadius: '6px',
					border: `1px solid ${lightTheme ? '#ddd' : 'var(--vscode-panel-border)'}`
				}}
			>
				<h3 style={{ margin: '0 0 12px 0', fontSize: '14px', fontWeight: 600 }}>New Message</h3>
				<div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
					<input
						type="text"
						value={newMessageUserStoryId}
						onChange={e => setNewMessageUserStoryId(e.target.value)}
						placeholder="User Story ID (e.g., US123)"
						style={{
							padding: '8px',
							borderRadius: '4px',
							border: `1px solid ${lightTheme ? '#ddd' : 'var(--vscode-input-border)'}`,
							backgroundColor: lightTheme ? '#fff' : 'var(--vscode-input-background)',
							color: 'var(--vscode-input-foreground)',
							fontSize: '12px'
						}}
					/>
					<textarea
						value={newMessageContent}
						onChange={e => setNewMessageContent(e.target.value)}
						placeholder="Enter your question or message..."
						rows={4}
						style={{
							padding: '8px',
							borderRadius: '4px',
							border: `1px solid ${lightTheme ? '#ddd' : 'var(--vscode-input-border)'}`,
							backgroundColor: lightTheme ? '#fff' : 'var(--vscode-input-background)',
							color: 'var(--vscode-input-foreground)',
							fontSize: '12px',
							resize: 'vertical',
							fontFamily: 'inherit'
						}}
					/>
					<button
						onClick={createMessage}
						disabled={!newMessageContent.trim() || !newMessageUserStoryId.trim()}
						style={{
							padding: '8px 16px',
							borderRadius: '4px',
							border: 'none',
							backgroundColor:
								newMessageContent.trim() && newMessageUserStoryId.trim()
									? lightTheme
										? '#007acc'
										: 'var(--vscode-button-background)'
									: lightTheme
										? '#ccc'
										: 'var(--vscode-button-secondaryBackground)',
							color:
								newMessageContent.trim() && newMessageUserStoryId.trim()
									? lightTheme
										? '#fff'
										: 'var(--vscode-button-foreground)'
									: lightTheme
										? '#666'
										: 'var(--vscode-button-secondaryForeground)',
							cursor:
								newMessageContent.trim() && newMessageUserStoryId.trim() ? 'pointer' : 'not-allowed',
							fontSize: '12px',
							fontWeight: 600
						}}
					>
						Post Message
					</button>
				</div>
			</div>

			{/* Messages List */}
			{messagesLoading && (
				<div style={{ textAlign: 'center', padding: '20px', color: 'var(--vscode-descriptionForeground)' }}>
					Loading messages...
				</div>
			)}

			{messagesError && (
				<div
					style={{
						padding: '12px',
						backgroundColor: lightTheme ? '#ffebee' : 'var(--vscode-inputValidation-errorBackground)',
						borderRadius: '4px',
						color: lightTheme ? '#c62828' : 'var(--vscode-errorForeground)',
						fontSize: '12px'
					}}
				>
					{messagesError}
				</div>
			)}

			{!messagesLoading && !messagesError && filteredMessages.length === 0 && (
				<div style={{ textAlign: 'center', padding: '40px', color: 'var(--vscode-descriptionForeground)' }}>
					No messages found. Create a new message to start a discussion!
				</div>
			)}

			{!messagesLoading && !messagesError && filteredMessages.length > 0 && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
					{filteredMessages.map(message => {
						const isExpanded = expandedMessages.has(message.id);
						const replyContent = replyContents.get(message.id) || '';

						return (
							<div
								key={message.id}
								style={{
									padding: '16px',
									backgroundColor: lightTheme ? '#fff' : 'var(--vscode-editor-background)',
									borderRadius: '6px',
									border: `1px solid ${lightTheme ? '#ddd' : 'var(--vscode-panel-border)'}`
								}}
							>
								<div
									style={{
										display: 'flex',
										justifyContent: 'space-between',
										alignItems: 'flex-start',
										marginBottom: '8px'
									}}
								>
									<div style={{ flex: 1 }}>
										<div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
											<span style={{ fontWeight: 600, fontSize: '13px' }}>
												{message.user?.displayName || 'Unknown User'}
											</span>
											<span
												style={{
													padding: '2px 6px',
													borderRadius: '3px',
													backgroundColor:
														message.status === 'open'
															? lightTheme
																? '#e3f2fd'
																: 'var(--vscode-badge-background)'
															: lightTheme
																? '#e8f5e9'
																: 'var(--vscode-badge-background)',
													color: 'var(--vscode-foreground)',
													fontSize: '10px',
													fontWeight: 600,
													textTransform: 'uppercase'
												}}
											>
												{message.status}
											</span>
										</div>
										<div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)', marginBottom: '8px' }}>
											User Story: {message.userStoryId} • {new Date(message.createdAt).toLocaleString()}
										</div>
										<div style={{ fontSize: '13px', lineHeight: '1.5', marginBottom: '12px' }}>
											{message.content}
										</div>
									</div>
								</div>

								{/* Replies Section */}
								{message.replies && message.replies.length > 0 && (
									<div
										style={{
											marginTop: '12px',
											paddingTop: '12px',
											borderTop: `1px solid ${lightTheme ? '#eee' : 'var(--vscode-panel-border)'}`
										}}
									>
										<button
											onClick={() => toggleMessageExpanded(message.id)}
											style={{
												padding: '4px 8px',
												border: 'none',
												backgroundColor: 'transparent',
												color: 'var(--vscode-textLink-foreground)',
												cursor: 'pointer',
												fontSize: '11px',
												marginBottom: '8px'
											}}
										>
											{isExpanded ? 'Hide' : 'Show'} {message.replies.length} reply{message.replies.length !== 1 ? 'ies' : ''}
										</button>

										{isExpanded && (
											<div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
												{message.replies.map(reply => (
													<div
														key={reply.id}
														style={{
															padding: '10px',
															backgroundColor: lightTheme ? '#f9f9f9' : 'var(--vscode-editor-background)',
															borderRadius: '4px',
															borderLeft: `3px solid ${lightTheme ? '#007acc' : 'var(--vscode-progressBar-background)'}`
														}}
													>
														<div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>
															{reply.user?.displayName || 'Unknown User'}
														</div>
														<div style={{ fontSize: '12px', lineHeight: '1.5' }}>{reply.content}</div>
														<div style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', marginTop: '4px' }}>
															{new Date(reply.createdAt).toLocaleString()}
														</div>
													</div>
												))}
											</div>
										)}
									</div>
								)}

								{/* Reply Input */}
								<div style={{ marginTop: '12px', paddingTop: '12px', borderTop: `1px solid ${lightTheme ? '#eee' : 'var(--vscode-panel-border)'}` }}>
									<textarea
										value={replyContent}
										onChange={e => {
											const newReplyContents = new Map(replyContents);
											newReplyContents.set(message.id, e.target.value);
											setReplyContents(newReplyContents);
										}}
										placeholder="Write a reply..."
										rows={2}
										style={{
											width: '100%',
											padding: '8px',
											borderRadius: '4px',
											border: `1px solid ${lightTheme ? '#ddd' : 'var(--vscode-input-border)'}`,
											backgroundColor: lightTheme ? '#fff' : 'var(--vscode-input-background)',
											color: 'var(--vscode-input-foreground)',
											fontSize: '12px',
											resize: 'vertical',
											fontFamily: 'inherit',
											marginBottom: '8px'
										}}
									/>
									<button
										onClick={() => createReply(message.id)}
										disabled={!replyContent.trim()}
										style={{
											padding: '6px 12px',
											borderRadius: '4px',
											border: 'none',
											backgroundColor: replyContent.trim()
												? lightTheme
													? '#007acc'
													: 'var(--vscode-button-background)'
												: lightTheme
													? '#ccc'
													: 'var(--vscode-button-secondaryBackground)',
											color: replyContent.trim()
												? lightTheme
													? '#fff'
													: 'var(--vscode-button-foreground)'
												: lightTheme
													? '#666'
													: 'var(--vscode-button-secondaryForeground)',
											cursor: replyContent.trim() ? 'pointer' : 'not-allowed',
											fontSize: '11px'
										}}
									>
										Reply
									</button>
								</div>
							</div>
						);
					})}
				</div>
			)}
		</div>
	);
};

export default CollaborationView;
