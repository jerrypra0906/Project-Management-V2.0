import express from 'express';
import store from '../store.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

// All user dashboard routes require authentication
router.use(authenticateToken);

// Get user's dashboard data
router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;
    const { teamMemberId } = req.query;
    const data = await store.read();
    
    // Check if user is admin
    const user = data.users.find(u => u.id === userId);
    const isAdmin = user && (user.isAdmin || user.role === 'Admin');
    const isManager = user && user.type === 'Manager';
    
    // If teamMemberId filter is provided and user is a Manager, filter by team member
    // Otherwise, use the current user's ID
    const filterUserId = teamMemberId && isManager ? teamMemberId : userId;
    
    // Verify that if teamMemberId is provided, the user is a Manager and the team member belongs to them
    if (teamMemberId && isManager) {
      const teamMemberIds = user.teamMemberIds ? (Array.isArray(user.teamMemberIds) ? user.teamMemberIds : user.teamMemberIds.split(',').map(id => id.trim())) : [];
      if (!teamMemberIds.includes(teamMemberId)) {
        return res.status(403).json({ error: 'You can only filter by your team members' });
      }
    }
    
    // Get user's projects (where user is IT PIC or Business Owner, or all if admin)
    // If filtering by team member, show projects where team member is involved
    let userProjects;
    if (isAdmin && !teamMemberId) {
      userProjects = data.initiatives.filter(i => i.type === 'Project');
    } else if (teamMemberId && isManager) {
      // Filter projects where team member is involved in any role
      userProjects = data.initiatives.filter(i => {
        if (i.type !== 'Project') return false;
        // Check IT PIC
        if (i.itPicId === filterUserId) return true;
        if (i.itPicIds) {
          const itPicIdsArray = Array.isArray(i.itPicIds) 
            ? i.itPicIds 
            : (typeof i.itPicIds === 'string' ? i.itPicIds.split(',').map(id => id.trim()) : []);
          if (itPicIdsArray.includes(filterUserId)) return true;
        }
        // Check IT PM
        if (i.itPmId === filterUserId) return true;
        // Check Business Owner
        if (i.businessOwnerId === filterUserId) return true;
        // Check Business Users
        if (i.businessUserIds) {
          const businessUserIdsArray = Array.isArray(i.businessUserIds)
            ? i.businessUserIds
            : (typeof i.businessUserIds === 'string' ? i.businessUserIds.split(',').map(id => id.trim()) : []);
          if (businessUserIdsArray.includes(filterUserId)) return true;
        }
        return false;
      });
    } else {
      userProjects = data.initiatives.filter(i => 
        i.type === 'Project' && 
        (i.itPicId === filterUserId || i.businessOwnerId === filterUserId)
      );
    }
    
    // Get user's CRs (where user is IT PIC or Business Owner, or all if admin)
    // If filtering by team member, show CRs where team member is involved
    let userCRs;
    if (isAdmin && !teamMemberId) {
      userCRs = data.initiatives.filter(i => i.type === 'CR');
    } else if (teamMemberId && isManager) {
      // Filter CRs where team member is involved in any role
      userCRs = data.initiatives.filter(i => {
        if (i.type !== 'CR') return false;
        // Check IT PIC
        if (i.itPicId === filterUserId) return true;
        if (i.itPicIds) {
          const itPicIdsArray = Array.isArray(i.itPicIds)
            ? i.itPicIds
            : (typeof i.itPicIds === 'string' ? i.itPicIds.split(',').map(id => id.trim()) : []);
          if (itPicIdsArray.includes(filterUserId)) return true;
        }
        // Check IT Manager
        if (i.itManagerIds) {
          const itManagerIdsArray = Array.isArray(i.itManagerIds)
            ? i.itManagerIds
            : (typeof i.itManagerIds === 'string' ? i.itManagerIds.split(',').map(id => id.trim()) : []);
          if (itManagerIdsArray.includes(filterUserId)) return true;
        }
        // Check Business Owner
        if (i.businessOwnerId === filterUserId) return true;
        // Check Business Users
        if (i.businessUserIds) {
          const businessUserIdsArray = Array.isArray(i.businessUserIds)
            ? i.businessUserIds
            : (typeof i.businessUserIds === 'string' ? i.businessUserIds.split(',').map(id => id.trim()) : []);
          if (businessUserIdsArray.includes(filterUserId)) return true;
        }
        return false;
      });
    } else {
      userCRs = data.initiatives.filter(i => 
        i.type === 'CR' && 
        (i.itPicId === filterUserId || i.businessOwnerId === filterUserId)
      );
    }
    
    // Get user's tasks (assigned tasks, or all if admin)
    // If filtering by team member, show tasks assigned to team member
    let userTasks;
    if (isAdmin && !teamMemberId) {
      userTasks = (data.tasks || []);
    } else {
      userTasks = (data.tasks || []).filter(t => t.assigneeId === filterUserId);
    }
    
    // Create to-do list based on status and milestone
    const todos = [];
    
    // Projects that need attention
    userProjects.forEach(project => {
      if (project.status === 'At Risk' || project.status === 'Delayed') {
        todos.push({
          id: project.id,
          type: 'Project',
          name: project.name,
          priority: project.priority || 'P2',
          status: project.status,
          action: project.status === 'At Risk' ? 'Review and mitigate risks' : 'Address delays',
          dueDate: project.endDate,
          link: `#view/${project.id}`
        });
      }
      // Projects approaching milestone deadlines
      if (project.milestone && project.milestone !== 'Live') {
        todos.push({
          id: project.id,
          type: 'Project',
          name: project.name,
          priority: project.priority || 'P2',
          status: project.status,
          action: `Update ${project.milestone} progress`,
          dueDate: project.endDate,
          link: `#view/${project.id}`
        });
      }
    });
    
    // CRs that need attention
    userCRs.forEach(cr => {
      if (cr.status === 'At Risk' || cr.status === 'Delayed') {
        todos.push({
          id: cr.id,
          type: 'CR',
          name: cr.name,
          priority: cr.priority || 'P2',
          status: cr.status,
          action: cr.status === 'At Risk' ? 'Review CR risks' : 'Address CR delays',
          dueDate: cr.endDate,
          link: `#view/${cr.id}`
        });
      }
    });
    
    // Sort todos by priority (P0 > P1 > P2) and then by status
    const priorityOrder = { 'P0': 0, 'P1': 1, 'P2': 2 };
    todos.sort((a, b) => {
      const priorityDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      if (priorityDiff !== 0) return priorityDiff;
      if (a.status === 'At Risk' && b.status !== 'At Risk') return -1;
      if (a.status !== 'At Risk' && b.status === 'At Risk') return 1;
      if (a.status === 'Delayed' && b.status !== 'Delayed') return -1;
      if (a.status !== 'Delayed' && b.status === 'Delayed') return 1;
      return 0;
    });
    
    // Calculate stats
    const stats = {
      totalProjects: userProjects.length,
      activeProjects: userProjects.filter(p => p.status && !['Cancelled', 'Live'].includes(p.status)).length,
      totalCRs: userCRs.length,
      activeCRs: userCRs.filter(cr => cr.status && !['Cancelled', 'Live'].includes(cr.status)).length,
      totalTasks: userTasks.length,
      activeTasks: userTasks.filter(t => t.status && !['Cancelled', 'Live'].includes(t.status)).length,
      todosCount: todos.length,
      urgentTodos: todos.filter(t => t.priority === 'P0' || t.status === 'At Risk' || t.status === 'Delayed').length
    };
    
    return res.json({
      todos: todos.slice(0, 20), // Limit to top 20
      projects: userProjects.map(p => ({
        id: p.id,
        name: p.name,
        status: p.status,
        priority: p.priority,
        milestone: p.milestone,
        endDate: p.endDate,
        departmentId: p.departmentId
      })),
      crs: userCRs.map(cr => ({
        id: cr.id,
        name: cr.name,
        status: cr.status,
        priority: cr.priority,
        milestone: cr.milestone,
        endDate: cr.endDate,
        departmentId: cr.departmentId
      })),
      tasks: userTasks.map(t => {
        const initiative = data.initiatives.find(i => i.id === t.initiativeId);
        return {
          id: t.id,
          name: t.name,
          status: t.status,
          milestone: t.milestone,
          startDate: t.startDate,
          endDate: t.endDate,
          initiativeId: t.initiativeId,
          initiativeName: initiative?.name || 'Unknown'
        };
      }),
      stats
    });
  } catch (e) {
    console.error('User dashboard error', e);
    return res.status(500).json({ error: 'Internal error' });
  }
});

export default router;

