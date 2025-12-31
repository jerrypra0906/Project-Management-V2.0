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
    const data = await store.read();
    
    // Check if user is admin
    const user = data.users.find(u => u.id === userId);
    const isAdmin = user && (user.isAdmin || user.role === 'Admin');
    
    // Get user's projects (where user is IT PIC or Business Owner, or all if admin)
    const userProjects = isAdmin 
      ? data.initiatives.filter(i => i.type === 'Project')
      : data.initiatives.filter(i => 
          i.type === 'Project' && 
          (i.itPicId === userId || i.businessOwnerId === userId)
        );
    
    // Get user's CRs (where user is IT PIC or Business Owner, or all if admin)
    const userCRs = isAdmin
      ? data.initiatives.filter(i => i.type === 'CR')
      : data.initiatives.filter(i => 
          i.type === 'CR' && 
          (i.itPicId === userId || i.businessOwnerId === userId)
        );
    
    // Get user's tasks (assigned tasks, or all if admin)
    const userTasks = isAdmin
      ? (data.tasks || [])
      : (data.tasks || []).filter(t => t.assigneeId === userId);
    
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

