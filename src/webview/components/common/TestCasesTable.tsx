import React from 'react';
import styled from 'styled-components';
import { TestCase } from '../../../types/rally';

const Table = styled.table`
	width: 100%;
	border-collapse: collapse;
	margin-top: 10px;
	background: var(--vscode-editor-background);
`;

const Th = styled.th`
	background: var(--vscode-panel-border);
	color: var(--vscode-foreground);
	font-size: 13px;
	font-weight: 600;
	padding: 8px 6px;
	border-bottom: 1px solid var(--vscode-panel-border);
`;

const Td = styled.td`
	color: var(--vscode-foreground);
	font-size: 13px;
	padding: 7px 6px;
	border-bottom: 1px solid var(--vscode-panel-border);
`;

const Row = styled.tr`
	&:hover {
		background: color-mix(in srgb, var(--vscode-panel-background) 80%, var(--vscode-editor-background));
	}
`;

interface TestCasesTableProps {
	testCases: TestCase[];
	loading?: boolean;
	error?: string | null;
}

const TestCasesTable: React.FC<TestCasesTableProps> = ({ testCases, loading, error }) => {
	if (loading) return <div>Loading test cases...</div>;
	if (error) return <div style={{ color: 'var(--vscode-errorForeground)' }}>{error}</div>;
	if (!testCases.length) return <div style={{ color: 'var(--vscode-descriptionForeground)' }}>No test cases found.</div>;

	return (
		<Table>
			<thead>
				<tr>
					<Th>ID</Th>
					<Th>Name</Th>
					<Th>State</Th>
					<Th>Type</Th>
					<Th>Priority</Th>
					<Th>Owner</Th>
				</tr>
			</thead>
			<tbody>
				{testCases.map(tc => (
					<Row key={tc.objectId}>
						<Td>{tc.formattedId}</Td>
						<Td>{tc.name}</Td>
						<Td>{tc.state}</Td>
						<Td>{tc.type}</Td>
						<Td>{tc.priority}</Td>
						<Td>{tc.owner}</Td>
					</Row>
				))}
			</tbody>
		</Table>
	);
};

export default TestCasesTable;
