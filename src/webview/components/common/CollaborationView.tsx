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
	onHelpRequestsCountChange?: (count: number) => void;
}

const CollaborationView: FC<CollaborationViewProps> = ({ selectedUserStoryId, onHelpRequestsCountChange }) => {
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
	const [showHelpRequestsOnly, setShowHelpRequestsOnly] = useState(false);
	const [selectedImage, setSelectedImage] = useState<string | null>(null);
	const [replyImages, setReplyImages] = useState<Map<string, string>>(new Map());

	const sendMessage = useCallback(
		(message: Record<string, unknown>) => {
			if (!vscode) return;
			vscode.postMessage(message);
		},
		[vscode]
	);

	// Send load messages command (does not set loading state - caller handles that)
	const sendLoadMessagesCommand = useCallback(
		(userStoryId: string) => {
			sendMessage({
				command: 'loadCollaborationMessages',
				userStoryId
			});
		},
		[sendMessage]
	);

	// Full load messages with loading state management (for user-triggered loads)
	const loadMessages = useCallback(
		(userStoryId: string | null) => {
			if (!userStoryId) {
				setMessages([]);
				return;
			}

			setMessagesLoading(true);
			setMessagesError(null);
			sendLoadMessagesCommand(userStoryId);
		},
		[sendLoadMessagesCommand]
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

		let finalContent = newMessageContent.trim();
		if (selectedImage) {
			finalContent += `\n\n![Image](${selectedImage})`;
		}

		sendMessage({
			command: 'createCollaborationMessage',
			userStoryId: newMessageUserStoryId,
			content: finalContent
		});

		setNewMessageContent('');
		setNewMessageUserStoryId('');
		setSelectedImage(null);
	}, [newMessageContent, newMessageUserStoryId, selectedImage, sendMessage]);

	const handleImageSelect = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		// Check file size (limit to 1MB for base64 encoding)
		if (file.size > 1024 * 1024) {
			alert('Image size must be less than 1MB');
			return;
		}

		// Check file type
		if (!file.type.startsWith('image/')) {
			alert('Please select an image file');
			return;
		}

		const reader = new FileReader();
		reader.onload = e => {
			const result = e.target?.result as string;
			setSelectedImage(result);
		};
		reader.readAsDataURL(file);
	}, []);

	const handleReplyImageSelect = useCallback(
		(messageId: string, event: React.ChangeEvent<HTMLInputElement>) => {
			const file = event.target.files?.[0];
			if (!file) return;

			// Check file size (limit to 1MB for base64 encoding)
			if (file.size > 1024 * 1024) {
				alert('Image size must be less than 1MB');
				return;
			}

			// Check file type
			if (!file.type.startsWith('image/')) {
				alert('Please select an image file');
				return;
			}

			const reader = new FileReader();
			reader.onload = e => {
				const result = e.target?.result as string;
				const newReplyImages = new Map(replyImages);
				newReplyImages.set(messageId, result);
				setReplyImages(newReplyImages);
			};
			reader.readAsDataURL(file);
		},
		[replyImages]
	);

	const createReply = useCallback(
		(messageId: string) => {
			const replyContent = replyContents.get(messageId);
			if (!replyContent || !replyContent.trim()) {
				return;
			}

			let finalContent = replyContent.trim();
			const replyImage = replyImages.get(messageId);
			if (replyImage) {
				finalContent += `\n\n![Image](${replyImage})`;
			}

			sendMessage({
				command: 'createCollaborationMessageReply',
				messageId,
				content: finalContent
			});

			const newReplyContents = new Map(replyContents);
			newReplyContents.delete(messageId);
			setReplyContents(newReplyContents);

			const newReplyImages = new Map(replyImages);
			newReplyImages.delete(messageId);
			setReplyImages(newReplyImages);
		},
		[replyContents, replyImages, sendMessage]
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

	// Handle selectedUserStoryId prop changes by syncing filter state and loading messages
	// This is a legitimate use case for setState in effect: syncing derived state from props

	useEffect(() => {
		if (selectedUserStoryId) {
			// eslint-disable-next-line react-hooks/set-state-in-effect -- Syncing prop to local state is a valid pattern
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
						setMessages(prev => prev.map(msg => (msg.id === message.reply.messageId ? { ...msg, replies: [...(msg.replies || []), message.reply] } : msg)));
					}
					break;

				case 'collaborationNotificationMarkedAsRead':
					setNotifications(prev => prev.map(notif => (notif.id === message.notificationId ? { ...notif, read: true } : notif)));
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
		let result = messages;

		// Filter by user story if specified
		if (selectedUserStoryFilter) {
			result = result.filter(msg => msg.userStoryId === selectedUserStoryFilter);
		}

		// Filter to show only help requests if enabled
		if (showHelpRequestsOnly) {
			result = result.filter(msg => msg.content.includes('🆘') || msg.content.includes('Support Request'));
		}

		return result;
	}, [messages, selectedUserStoryFilter, showHelpRequestsOnly]);

	const helpRequestsCount = useMemo(() => {
		return messages.filter(msg => msg.content.includes('🆘') || msg.content.includes('Support Request')).length;
	}, [messages]);

	// Notify parent of help requests count changes
	useEffect(() => {
		if (onHelpRequestsCountChange) {
			onHelpRequestsCountChange(helpRequestsCount);
		}
	}, [helpRequestsCount, onHelpRequestsCountChange]);

	// Function to render message content with images
	const renderMessageContent = (content: string) => {
		// Simple markdown image parser for ![alt](url) format
		const parts: (string | JSX.Element)[] = [];
		let lastIndex = 0;
		const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g;
		let match;

		while ((match = imageRegex.exec(content)) !== null) {
			// Add text before the image
			if (match.index > lastIndex) {
				parts.push(content.substring(lastIndex, match.index));
			}

			// Add the image
			const imageUrl = match[2];
			parts.push(
				<img
					key={`img-${match.index}`}
					src={imageUrl}
					alt={match[1] || 'Image'}
					style={{
						maxWidth: '100%',
						maxHeight: '300px',
						borderRadius: '4px',
						marginTop: '8px',
						marginBottom: '8px',
						display: 'block'
					}}
				/>
			);

			lastIndex = match.index + match[0].length;
		}

		// Add remaining text
		if (lastIndex < content.length) {
			parts.push(content.substring(lastIndex));
		}

		return parts.length > 0 ? parts : content;
	};

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
				<div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
					<h2 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Collaboration</h2>
					{helpRequestsCount > 0 && (
						<span
							style={{
								padding: '4px 8px',
								borderRadius: '12px',
								backgroundColor: lightTheme ? '#ff9800' : 'rgba(255, 152, 0, 0.2)',
								color: lightTheme ? '#fff' : '#ffb74d',
								fontSize: '11px',
								fontWeight: 600
							}}
							title={`${helpRequestsCount} help request(s)`}
						>
							🆘 {helpRequestsCount}
						</span>
					)}
				</div>
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
									backgroundColor: notif.read ? 'transparent' : lightTheme ? '#e3f2fd' : 'var(--vscode-list-activeSelectionBackground)',
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
				<div style={{ display: 'flex', gap: '12px', marginBottom: '12px' }}>
					<button
						onClick={() => setShowHelpRequestsOnly(!showHelpRequestsOnly)}
						style={{
							padding: '6px 12px',
							borderRadius: '4px',
							border: `1px solid ${lightTheme ? '#ddd' : 'var(--vscode-panel-border)'}`,
							backgroundColor: showHelpRequestsOnly ? (lightTheme ? '#ff9800' : 'rgba(255, 152, 0, 0.2)') : 'transparent',
							color: showHelpRequestsOnly ? (lightTheme ? '#fff' : '#ffb74d') : 'var(--vscode-foreground)',
							cursor: 'pointer',
							fontSize: '11px',
							fontWeight: 600
						}}
					>
						🆘 Help Requests Only {showHelpRequestsOnly ? '✓' : ''}
					</button>
				</div>
				<label style={{ display: 'block', marginBottom: '8px', fontSize: '12px', fontWeight: 600 }}>Filter by User Story ID:</label>
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
					{selectedImage && (
						<div style={{ position: 'relative', display: 'inline-block' }}>
							<img
								src={selectedImage}
								alt="Selected"
								style={{
									maxWidth: '200px',
									maxHeight: '150px',
									borderRadius: '4px',
									border: `1px solid ${lightTheme ? '#ddd' : 'var(--vscode-panel-border)'}`
								}}
							/>
							<button
								onClick={() => setSelectedImage(null)}
								style={{
									position: 'absolute',
									top: '4px',
									right: '4px',
									padding: '4px 8px',
									backgroundColor: 'rgba(0, 0, 0, 0.6)',
									color: '#fff',
									border: 'none',
									borderRadius: '3px',
									cursor: 'pointer',
									fontSize: '11px'
								}}
							>
								✕
							</button>
						</div>
					)}
					<div style={{ display: 'flex', gap: '8px' }}>
						<label
							style={{
								padding: '6px 12px',
								borderRadius: '4px',
								border: `1px solid ${lightTheme ? '#ddd' : 'var(--vscode-panel-border)'}`,
								backgroundColor: 'transparent',
								color: 'var(--vscode-foreground)',
								cursor: 'pointer',
								fontSize: '11px',
								display: 'inline-flex',
								alignItems: 'center',
								gap: '4px'
							}}
						>
							📎 Attach Image
							<input type="file" accept="image/*" onChange={handleImageSelect} style={{ display: 'none' }} />
						</label>
						<button
							onClick={createMessage}
							disabled={!newMessageContent.trim() || !newMessageUserStoryId.trim()}
							style={{
								flex: 1,
								padding: '8px 16px',
								borderRadius: '4px',
								border: 'none',
								backgroundColor: newMessageContent.trim() && newMessageUserStoryId.trim() ? (lightTheme ? '#007acc' : 'var(--vscode-button-background)') : lightTheme ? '#ccc' : 'var(--vscode-button-secondaryBackground)',
								color: newMessageContent.trim() && newMessageUserStoryId.trim() ? (lightTheme ? '#fff' : 'var(--vscode-button-foreground)') : lightTheme ? '#666' : 'var(--vscode-button-secondaryForeground)',
								cursor: newMessageContent.trim() && newMessageUserStoryId.trim() ? 'pointer' : 'not-allowed',
								fontSize: '12px',
								fontWeight: 600
							}}
						>
							Post Message
						</button>
					</div>
				</div>
			</div>

			{/* Messages List */}
			{messagesLoading && <div style={{ textAlign: 'center', padding: '20px', color: 'var(--vscode-descriptionForeground)' }}>Loading messages...</div>}

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

			{!messagesLoading && !messagesError && filteredMessages.length === 0 && <div style={{ textAlign: 'center', padding: '40px', color: 'var(--vscode-descriptionForeground)' }}>No messages found. Create a new message to start a discussion!</div>}

			{!messagesLoading && !messagesError && filteredMessages.length > 0 && (
				<div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
					{filteredMessages.map(message => {
						const isExpanded = expandedMessages.has(message.id);
						const replyContent = replyContents.get(message.id) || '';
						const isHelpRequest = message.content.includes('🆘') || message.content.includes('Support Request');

						return (
							<div
								key={message.id}
								style={{
									padding: '16px',
									backgroundColor: lightTheme ? '#fff' : 'var(--vscode-editor-background)',
									borderRadius: '6px',
									border: isHelpRequest ? `2px solid ${lightTheme ? '#ff9800' : 'rgba(255, 152, 0, 0.5)'}` : `1px solid ${lightTheme ? '#ddd' : 'var(--vscode-panel-border)'}`,
									boxShadow: isHelpRequest ? `0 0 8px ${lightTheme ? 'rgba(255, 152, 0, 0.2)' : 'rgba(255, 152, 0, 0.1)'}` : 'none'
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
											<span style={{ fontWeight: 600, fontSize: '13px' }}>{message.user?.displayName || 'Unknown User'}</span>
											{isHelpRequest && (
												<span
													style={{
														padding: '2px 8px',
														borderRadius: '3px',
														backgroundColor: lightTheme ? '#ff9800' : 'rgba(255, 152, 0, 0.2)',
														color: lightTheme ? '#fff' : '#ffb74d',
														fontSize: '10px',
														fontWeight: 600,
														textTransform: 'uppercase'
													}}
												>
													🆘 HELP REQUEST
												</span>
											)}
											<span
												style={{
													padding: '2px 6px',
													borderRadius: '3px',
													backgroundColor: message.status === 'open' ? (lightTheme ? '#e3f2fd' : 'var(--vscode-badge-background)') : lightTheme ? '#e8f5e9' : 'var(--vscode-badge-background)',
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
										<div style={{ fontSize: '13px', lineHeight: '1.5', marginBottom: '12px', whiteSpace: 'pre-wrap' }}>{renderMessageContent(message.content)}</div>
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
														<div style={{ fontSize: '11px', fontWeight: 600, marginBottom: '4px' }}>{reply.user?.displayName || 'Unknown User'}</div>
														<div style={{ fontSize: '12px', lineHeight: '1.5' }}>{renderMessageContent(reply.content)}</div>
														<div style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)', marginTop: '4px' }}>{new Date(reply.createdAt).toLocaleString()}</div>
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

											marginBottom: '8px'
										}}
									/>
									{replyImages.get(message.id) && (
										<div style={{ position: 'relative', display: 'inline-block', marginBottom: '8px' }}>
											<img
												src={replyImages.get(message.id)!}
												alt="Selected"
												style={{
													maxWidth: '150px',
													maxHeight: '100px',
													borderRadius: '4px',
													border: `1px solid ${lightTheme ? '#ddd' : 'var(--vscode-panel-border)'}`
												}}
											/>
											<button
												onClick={() => {
													const newReplyImages = new Map(replyImages);
													newReplyImages.delete(message.id);
													setReplyImages(newReplyImages);
												}}
												style={{
													position: 'absolute',
													top: '4px',
													right: '4px',
													padding: '2px 6px',
													backgroundColor: 'rgba(0, 0, 0, 0.6)',
													color: '#fff',
													border: 'none',
													borderRadius: '3px',
													cursor: 'pointer',
													fontSize: '10px'
												}}
											>
												✕
											</button>
										</div>
									)}
									<div style={{ display: 'flex', gap: '8px' }}>
										<label
											style={{
												padding: '4px 10px',
												borderRadius: '4px',
												border: `1px solid ${lightTheme ? '#ddd' : 'var(--vscode-panel-border)'}`,
												backgroundColor: 'transparent',
												color: 'var(--vscode-foreground)',
												cursor: 'pointer',
												fontSize: '10px',
												display: 'inline-flex',
												alignItems: 'center',
												gap: '4px'
											}}
										>
											📎
											<input type="file" accept="image/*" onChange={e => handleReplyImageSelect(message.id, e)} style={{ display: 'none' }} />
										</label>
										<button
											onClick={() => createReply(message.id)}
											disabled={!replyContent.trim()}
											style={{
												flex: 1,
												padding: '6px 12px',
												borderRadius: '4px',
												border: 'none',
												backgroundColor: replyContent.trim() ? (lightTheme ? '#007acc' : 'var(--vscode-button-background)') : lightTheme ? '#ccc' : 'var(--vscode-button-secondaryBackground)',
												color: replyContent.trim() ? (lightTheme ? '#fff' : 'var(--vscode-button-foreground)') : lightTheme ? '#666' : 'var(--vscode-button-secondaryForeground)',
												cursor: replyContent.trim() ? 'pointer' : 'not-allowed',
												fontSize: '11px'
											}}
										>
											Reply
										</button>
									</div>
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
