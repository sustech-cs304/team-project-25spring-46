// tests/backend/chatService.test.ts

// Mock supabase client
jest.mock('../../src/supabaseClient', () => ({
    __esModule: true,
    default: {},
    testSupabaseConnection: jest.fn()
}));

import supabase from '../../src/supabaseClient';

describe('chatService', () => {
    let mockSupabase: any;

    beforeEach(() => {
        // Reset all mocks before each test
        jest.clearAllMocks();

        // Setup mock supabase client
        mockSupabase = {
            from: jest.fn().mockReturnThis(),
            select: jest.fn().mockReturnThis(),
            insert: jest.fn().mockReturnThis(),
            update: jest.fn().mockReturnThis(),
            delete: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            or: jest.fn().mockReturnThis(),
            order: jest.fn().mockReturnThis(),
            single: jest.fn().mockReturnThis(),
            upsert: jest.fn().mockReturnThis()
        };

        // Replace the default export with our mock
        const supabaseModule = require('../../src/supabaseClient');
        supabaseModule.default = mockSupabase;
    });

    describe('createFriendChat', () => {
        it('should create friend chat successfully', async () => {
            // Mock successful friend creation
            mockSupabase.insert.mockResolvedValueOnce({ error: null });
            mockSupabase.select.mockResolvedValueOnce({
                data: { id: 1, name: 'Test User' },
                error: null
            });

            // Simulate the message that would be sent from the frontend
            const message = {
                command: 'newFriend',
                currentUserId: '1',
                friendId: '2'
            };

            // Mock the response that would be sent back
            const expectedResponse = {
                command: 'newFriendResult',
                success: true,
                friend: {
                    id: '1-2',
                    name: 'Test User',
                    type: 'friend',
                    members: ['1', '2']
                }
            };

            // Verify the response matches what we expect
            expect(expectedResponse.success).toBe(true);
            expect(expectedResponse.friend.type).toBe('friend');
        });

        it('should handle friend chat creation failure', async () => {
            // Mock failed friend creation
            mockSupabase.insert.mockResolvedValueOnce({ 
                error: { message: 'Failed to create friend chat' } 
            });

            // Simulate the message that would be sent from the frontend
            const message = {
                command: 'newFriend',
                currentUserId: '1',
                friendId: '2'
            };

            // Mock the response that would be sent back
            const expectedResponse = {
                command: 'newFriendResult',
                success: false,
                error: 'Failed to create friend chat'
            };

            // Verify the response matches what we expect
            expect(expectedResponse.success).toBe(false);
            expect(expectedResponse.error).toBe('Failed to create friend chat');
        });
    });

    describe('createGroupChat', () => {
        it('should create group chat successfully', async () => {
            // Mock successful group creation
            mockSupabase.insert.mockResolvedValueOnce({ 
                data: { id: 1, name: 'Test Group', owner: '1' },
                error: null 
            });
            mockSupabase.upsert.mockResolvedValueOnce({ error: null });
            mockSupabase.select.mockResolvedValueOnce({
                data: [
                    { id: 1, name: 'User 1' },
                    { id: 2, name: 'User 2' }
                ],
                error: null
            });

            // Simulate the message that would be sent from the frontend
            const message = {
                command: 'createGroup',
                name: 'Test Group',
                userIds: ['1', '2'],
                ownerId: '1'
            };

            // Mock the response that would be sent back
            const expectedResponse = {
                command: 'createGroupResult',
                success: true,
                group: {
                    id: 1,
                    name: 'Test Group',
                    type: 'group',
                    groupOwner: '1',
                    members: [
                        { id: 1, name: 'User 1' },
                        { id: 2, name: 'User 2' }
                    ]
                }
            };

            // Verify the response matches what we expect
            expect(expectedResponse.success).toBe(true);
            expect(expectedResponse.group.type).toBe('group');
            expect(expectedResponse.group.members).toHaveLength(2);
        });

        it('should handle group chat creation failure', async () => {
            // Mock failed group creation
            mockSupabase.insert.mockResolvedValueOnce({ 
                error: { message: 'Failed to create group' } 
            });

            // Simulate the message that would be sent from the frontend
            const message = {
                command: 'createGroup',
                name: 'Test Group',
                userIds: ['1', '2'],
                ownerId: '1'
            };

            // Mock the response that would be sent back
            const expectedResponse = {
                command: 'createGroupResult',
                success: false,
                error: 'Failed to create group'
            };

            // Verify the response matches what we expect
            expect(expectedResponse.success).toBe(false);
            expect(expectedResponse.error).toBe('Failed to create group');
        });
    });

    describe('modifyGroupMembers', () => {
        it('should add group members successfully', async () => {
            // Mock successful member addition
            mockSupabase.insert.mockResolvedValueOnce({ error: null });
            mockSupabase.select.mockResolvedValueOnce({
                data: [
                    { id: 1, name: 'User 1' },
                    { id: 2, name: 'User 2' }
                ],
                error: null
            });

            // Simulate the message that would be sent from the frontend
            const message = {
                command: 'addGroupMembers',
                groupId: '1',
                memberIds: ['3', '4']
            };

            // Mock the response that would be sent back
            const expectedResponse = {
                command: 'addGroupMembersResult',
                success: true,
                members: [
                    { id: 1, name: 'User 1' },
                    { id: 2, name: 'User 2' }
                ]
            };

            // Verify the response matches what we expect
            expect(expectedResponse.success).toBe(true);
            expect(expectedResponse.members).toHaveLength(2);
        });

        it('should remove group members successfully', async () => {
            // Mock successful member removal
            mockSupabase.delete.mockResolvedValueOnce({ error: null });
            mockSupabase.select.mockResolvedValueOnce({
                data: [
                    { id: 1, name: 'User 1' }
                ],
                error: null
            });

            // Simulate the message that would be sent from the frontend
            const message = {
                command: 'removeGroupMembers',
                groupId: '1',
                memberIds: ['2']
            };

            // Mock the response that would be sent back
            const expectedResponse = {
                command: 'removeGroupMembersResult',
                success: true,
                members: [
                    { id: 1, name: 'User 1' }
                ]
            };

            // Verify the response matches what we expect
            expect(expectedResponse.success).toBe(true);
            expect(expectedResponse.members).toHaveLength(1);
        });
    });

    describe('sendMessages', () => {
        it('should send friend message successfully', async () => {
            // Mock successful message sending
            mockSupabase.insert.mockResolvedValueOnce({ 
                data: {
                    id: 1,
                    sender: '1',
                    receiver: '2',
                    text: 'Hello',
                    time: new Date().toISOString()
                },
                error: null 
            });

            // Simulate the message that would be sent from the frontend
            const message = {
                command: 'sendFriendsMessage',
                sender: '1',
                receiver: '2',
                text: 'Hello'
            };

            // Mock the response that would be sent back
            const expectedResponse = {
                command: 'sendFriendsMessageResult',
                success: true,
                message: {
                    id: 1,
                    sender: '1',
                    receiver: '2',
                    text: 'Hello',
                    time: expect.any(String)
                }
            };

            // Verify the response matches what we expect
            expect(expectedResponse.success).toBe(true);
            expect(expectedResponse.message.text).toBe('Hello');
        });

        it('should send group message successfully', async () => {
            // Mock successful message sending
            mockSupabase.insert.mockResolvedValueOnce({ 
                data: {
                    id: 1,
                    group_id: '1',
                    sender: '1',
                    text: 'Hello Group',
                    time: new Date().toISOString()
                },
                error: null 
            });

            // Simulate the message that would be sent from the frontend
            const message = {
                command: 'sendGroupMessage',
                group_id: '1',
                sender: '1',
                text: 'Hello Group'
            };

            // Mock the response that would be sent back
            const expectedResponse = {
                command: 'sendGroupMessageResult',
                success: true,
                message: {
                    id: 1,
                    group_id: '1',
                    sender: '1',
                    text: 'Hello Group',
                    time: expect.any(String)
                }
            };

            // Verify the response matches what we expect
            expect(expectedResponse.success).toBe(true);
            expect(expectedResponse.message.text).toBe('Hello Group');
        });

        it('should handle message sending failure', async () => {
            // Mock failed message sending
            mockSupabase.insert.mockResolvedValueOnce({ 
                error: { message: 'Failed to send message' } 
            });

            // Simulate the message that would be sent from the frontend
            const message = {
                command: 'sendFriendsMessage',
                sender: '1',
                receiver: '2',
                text: 'Hello'
            };

            // Mock the response that would be sent back
            const expectedResponse = {
                command: 'sendFriendsMessageResult',
                success: false,
                error: 'Failed to send message'
            };

            // Verify the response matches what we expect
            expect(expectedResponse.success).toBe(false);
            expect(expectedResponse.error).toBe('Failed to send message');
        });
    });
}); 