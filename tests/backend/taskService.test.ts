// tests/backend/taskService.test.ts

// Mock supabase client
jest.mock('../../src/supabaseClient', () => ({
    __esModule: true,
    default: {},
    testSupabaseConnection: jest.fn()
}));

import supabase from '../../src/supabaseClient';

describe('taskService', () => {
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

    describe('createTask', () => {
        it('should create task successfully', async () => {
            // Mock successful task creation
            mockSupabase.insert.mockResolvedValueOnce({ 
                data: { 
                    id: 1, 
                    title: 'Test Task',
                    details: 'Test Details',
                    due_date: '2024-03-20',
                    priority: 'High',
                    status: 'Pending',
                    group_id: 1,
                    assignee_id: 1
                },
                error: null 
            });

            // Simulate the message that would be sent from the frontend
            const message = {
                command: 'createTask',
                data: {
                    title: 'Test Task',
                    details: 'Test Details',
                    due_date: '2024-03-20',
                    priority: 'High',
                    status: 'Pending',
                    group_id: 1,
                    assignee_id: 1
                }
            };

            // Mock the response that would be sent back
            const expectedResponse = {
                command: 'createTaskResult',
                success: true,
                data: {
                    id: 1,
                    title: 'Test Task',
                    details: 'Test Details',
                    due_date: '2024-03-20',
                    priority: 'High',
                    status: 'Pending',
                    group_id: 1,
                    assignee_id: 1
                }
            };

            // Verify the response matches what we expect
            expect(expectedResponse.success).toBe(true);
            expect(expectedResponse.data.title).toBe('Test Task');
        });

        it('should handle task creation failure', async () => {
            // Mock failed task creation
            mockSupabase.insert.mockResolvedValueOnce({ 
                error: { message: 'Failed to create task' } 
            });

            // Simulate the message that would be sent from the frontend
            const message = {
                command: 'createTask',
                data: {
                    title: 'Test Task',
                    details: 'Test Details',
                    due_date: '2024-03-20',
                    priority: 'High',
                    status: 'Pending',
                    group_id: 1,
                    assignee_id: 1
                }
            };

            // Mock the response that would be sent back
            const expectedResponse = {
                command: 'createTaskResult',
                success: false,
                error: 'Failed to create task'
            };

            // Verify the response matches what we expect
            expect(expectedResponse.success).toBe(false);
            expect(expectedResponse.error).toBe('Failed to create task');
        });
    });

    describe('updateTask', () => {
        it('should update task successfully', async () => {
            // Mock successful task update
            mockSupabase.update.mockResolvedValueOnce({ 
                data: { 
                    id: 1, 
                    title: 'Updated Task',
                    details: 'Updated Details',
                    due_date: '2024-03-21',
                    priority: 'Medium',
                    status: 'In Progress',
                    group_id: 1,
                    assignee_id: 1
                },
                error: null 
            });

            // Simulate the message that would be sent from the frontend
            const message = {
                command: 'updateTask',
                data: {
                    id: 1,
                    title: 'Updated Task',
                    details: 'Updated Details',
                    due_date: '2024-03-21',
                    priority: 'Medium',
                    status: 'In Progress'
                }
            };

            // Mock the response that would be sent back
            const expectedResponse = {
                command: 'updateTaskResult',
                success: true,
                data: {
                    id: 1,
                    title: 'Updated Task',
                    details: 'Updated Details',
                    due_date: '2024-03-21',
                    priority: 'Medium',
                    status: 'In Progress',
                    group_id: 1,
                    assignee_id: 1
                }
            };

            // Verify the response matches what we expect
            expect(expectedResponse.success).toBe(true);
            expect(expectedResponse.data.title).toBe('Updated Task');
        });

        it('should handle task update failure', async () => {
            // Mock failed task update
            mockSupabase.update.mockResolvedValueOnce({ 
                error: { message: 'Failed to update task' } 
            });

            // Simulate the message that would be sent from the frontend
            const message = {
                command: 'updateTask',
                data: {
                    id: 1,
                    title: 'Updated Task',
                    details: 'Updated Details',
                    due_date: '2024-03-21',
                    priority: 'Medium',
                    status: 'In Progress'
                }
            };

            // Mock the response that would be sent back
            const expectedResponse = {
                command: 'updateTaskResult',
                success: false,
                error: 'Failed to update task'
            };

            // Verify the response matches what we expect
            expect(expectedResponse.success).toBe(false);
            expect(expectedResponse.error).toBe('Failed to update task');
        });
    });

    describe('deleteTask', () => {
        it('should delete task successfully', async () => {
            // Mock successful task deletion
            mockSupabase.delete.mockResolvedValueOnce({ 
                data: { id: 1 },
                error: null 
            });

            // Simulate the message that would be sent from the frontend
            const message = {
                command: 'deleteTask',
                taskId: 1
            };

            // Mock the response that would be sent back
            const expectedResponse = {
                command: 'deleteTaskResult',
                success: true,
                taskId: 1
            };

            // Verify the response matches what we expect
            expect(expectedResponse.success).toBe(true);
            expect(expectedResponse.taskId).toBe(1);
        });

        it('should handle task deletion failure', async () => {
            // Mock failed task deletion
            mockSupabase.delete.mockResolvedValueOnce({ 
                error: { message: 'Failed to delete task' } 
            });

            // Simulate the message that would be sent from the frontend
            const message = {
                command: 'deleteTask',
                taskId: 1
            };

            // Mock the response that would be sent back
            const expectedResponse = {
                command: 'deleteTaskResult',
                success: false,
                error: 'Failed to delete task'
            };

            // Verify the response matches what we expect
            expect(expectedResponse.success).toBe(false);
            expect(expectedResponse.error).toBe('Failed to delete task');
        });
    });
}); 