const app = document.getElementById('app');
console.log('JavaScript loaded, app element:', app);
const nav = {
  list: document.getElementById('nav-list'),
  crlist: document.getElementById('nav-crlist'),
  New: document.getElementById('nav-new'),
  dashboard: document.getElementById('nav-dashboard')
};

function setActive(hash) {
  document.querySelectorAll('nav a').forEach(a => a.classList.remove('active'));
  const id = hash.replace('#','') || 'list';
  const el = document.getElementById('nav-' + id);
  if (el) el.classList.add('active');
}

async function fetchJSON(url, options) {
  // Avoid cached 304 responses by adding a timestamp and disabling cache
  const cacheBuster = (url.includes('?') ? '&' : '?') + '_ts=' + Date.now();
  const res = await fetch(url + cacheBuster, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache', ...(options && options.headers ? options.headers : {}) },
    ...(options || {})
  });
  if (!res.ok) {
    // Surface status for easier debugging
    const body = await res.text().catch(() => '');
    throw new Error(`Request failed ${res.status}: ${body || res.statusText}`);
  }
  return res.json();
}

let LOOKUPS = { users: [], departments: [] };
async function ensureLookups() {
  console.log('ensureLookups called, current LOOKUPS:', LOOKUPS);
  if (LOOKUPS.users.length && LOOKUPS.departments.length) return LOOKUPS;
  console.log('Fetching lookups from API...');
  LOOKUPS = await fetchJSON('/api/lookups');
  console.log('Lookups fetched:', LOOKUPS);
  return LOOKUPS;
}

function nameById(arr, id) {
  const m = arr.find(x => x.id === id);
  return m ? m.name : id || '';
}

function initiativeRow(i, crData = null) {
  const dep = nameById(LOOKUPS.departments, i.departmentId);
  const itpic = nameById(LOOKUPS.users, i.itPicId);
  const bo = nameById(LOOKUPS.users, i.businessOwnerId);
  const doc = i.documentationLink || '';
  const statusClass = i.status?.replace(/\s+/g, '-') || '';
  const priorityClass = i.priority || '';
  
  // CR Timeline display
  let crTimeline = '';
  if (i.type === 'CR' && crData) {
    const phases = [
      { name: 'CR Sec 1', start: crData.crSection1Start, end: crData.crSection1End },
      { name: 'CR Sec 2', start: crData.crSection2Start, end: crData.crSection2End },
      { name: 'CR Sec 3', start: crData.crSection3Start, end: crData.crSection3End },
      { name: 'Dev', start: crData.developmentStart, end: crData.developmentEnd },
      { name: 'SIT', start: crData.sitStart, end: crData.sitEnd },
      { name: 'UAT', start: crData.uatStart, end: crData.uatEnd },
      { name: 'Live', start: crData.liveStart, end: crData.liveEnd }
    ];
    
    const activePhases = phases.filter(p => p.start || p.end);
    if (activePhases.length > 0) {
      crTimeline = `<div style="font-size: 10px; line-height: 1.2;">
        ${activePhases.map(p => 
          `<div style="margin-bottom: 2px;">
            <strong>${p.name}:</strong> ${p.start || ''} - ${p.end || 'Ongoing'}
          </div>`
        ).join('')}
      </div>`;
    }
  }
  
  const timelineCell = i.type === 'CR' ? `<td class="col-timeline">${crTimeline}</td>` : '';
  
  return `<tr class="status-${statusClass}">
    <td class="col-ticket">${i.ticket || ''}</td>
    <td class="col-name"><strong>${i.name}</strong></td>
    <td class="col-priority"><span class="priority-badge priority-${priorityClass}">${i.priority}</span></td>
    <td class="col-status"><span class="status-badge status-${statusClass}">${i.status}</span></td>
    <td class="col-milestone">${i.milestone}</td>
    <td class="col-department">${dep}</td>
    <td class="col-owner">${bo}</td>
    <td class="col-pic">${itpic}</td>
    <td class="col-date">${i.startDate?.slice(0,10) || ''}</td>
    <td class="col-date">${i.createdAt?.slice(0,10) || ''}</td>
    <td class="col-date">${i.endDate?.slice(0,10) || ''}</td>
    <td class="col-impact" title="${i.businessImpact || ''}">${(i.businessImpact || '').toString().slice(0,100)}${(i.businessImpact || '').length > 100 ? '...' : ''}</td>
    <td class="col-remark" title="${i.remark || ''}">${(i.remark || '').toString().slice(0,60)}${(i.remark || '').length > 60 ? '...' : ''}</td>
    <td class="col-doc" title="${doc}">${doc.slice(0, 40)}${doc.length > 40 ? '...' : ''}</td>
    ${timelineCell}
    <td class="col-actions">
      <button data-id="${i.id}" class="view" style="margin-right: 8px;">View</button>
      <button data-id="${i.id}" class="delete" style="color: var(--danger);">Delete</button>
    </td>
  </tr>`;
}

async function renderList() {
  console.log('renderList called');
  setActive('#list');
  try {
    await ensureLookups();
    console.log('Lookups loaded successfully');
  } catch (error) {
    console.error('Error loading lookups:', error);
    app.innerHTML = `<div class="error">Error loading lookups: ${error.message}</div>`;
    return;
  }
  const urlParams = new URLSearchParams(location.search);
  const q = urlParams.get('q') || '';
  const filter = {
    departmentId: urlParams.get('departmentId') || '',
    priority: urlParams.get('priority') || '',
    status: urlParams.get('status') || '',
    milestone: urlParams.get('milestone') || ''
  };
  const sortParam = urlParams.get('sort') || '';
  const apiQs = new URLSearchParams({ ...(q ? { q } : {}), ...Object.fromEntries(Object.entries(filter).filter(([,v]) => v)) });
  console.log('Fetching data from API...');
  let data;
  try {
    data = await fetchJSON('/api/initiatives' + (apiQs.toString() ? `?${apiQs.toString()}` : ''));
  } catch (e) {
    console.error('Failed to fetch initiatives:', e);
    app.innerHTML = `<div class="error">Failed to load initiatives: ${e.message}</div>`;
    return;
  }
  console.log('Data fetched, count:', data.length);
  console.log('Sample data item:', data[0]);
  if (sortParam) {
    const [key, dir] = sortParam.split(':');
    const dirMul = dir === 'desc' ? -1 : 1;
    const nameFor = (keyName, id) => {
      if (keyName === 'departmentId') return nameById(LOOKUPS.departments, id);
      if (keyName === 'businessOwnerId' || keyName === 'itPicId') return nameById(LOOKUPS.users, id);
      return id || '';
    };
    data = data.slice().sort((a,b) => {
      const va = (key.endsWith('Id') ? nameFor(key, a[key]) : a[key]) || '';
      const vb = (key.endsWith('Id') ? nameFor(key, b[key]) : b[key]) || '';
      return String(va).localeCompare(String(vb)) * dirMul;
    });
  }
  app.innerHTML = `
    <div class="toolbar">
      <input id="search" placeholder="Search name or description" value="${q}">
      <button id="doSearch">Search</button>
      <select id="fDepartment"><option value="">Department</option>${LOOKUPS.departments.map(d => `<option value="${d.id}" ${filter.departmentId===d.id?'selected':''}>${d.name}</option>`).join('')}</select>
      <select id="fPriority"><option value="">Priority</option><option ${filter.priority==='P0'?'selected':''}>P0</option><option ${filter.priority==='P1'?'selected':''}>P1</option><option ${filter.priority==='P2'?'selected':''}>P2</option></select>
      <select id="fStatus"><option value="">Status</option>${['Not Started','On Hold','On Track','At Risk','Delayed','Live','Cancelled'].map(s=>`<option ${filter.status===s?'selected':''}>${s}</option>`).join('')}</select>
      <select id="fMilestone"><option value="">Milestone</option>${['Pre-grooming','Grooming','Tech Assessment','Planning','Development','Testing','Live'].map(m=>`<option ${filter.milestone===m?'selected':''}>${m}</option>`).join('')}</select>
      <a href="#new"><button class="primary">New Initiative</button></a>
    </div>
    <table>
      <thead>
        <tr>
          <th class="sortable col-ticket" data-key="ticket">Ticket</th>
          <th class="sortable col-name" data-key="name">Initiative Name</th>
          <th class="sortable col-priority" data-key="priority">Priority</th>
          <th class="sortable col-status" data-key="status">Status</th>
          <th class="sortable col-milestone" data-key="milestone">Milestone</th>
          <th class="sortable col-department" data-key="departmentId">Department</th>
          <th class="sortable col-owner" data-key="businessOwnerId">Business Owner</th>
          <th class="sortable col-pic" data-key="itPicId">IT PIC</th>
          <th class="sortable col-date" data-key="startDate">Start Date</th>
          <th class="sortable col-date" data-key="createdAt">Create Date</th>
          <th class="sortable col-date" data-key="endDate">End Date</th>
          <th class="col-impact">Business Impact</th>
          <th class="col-remark">Remark</th>
          <th class="col-doc">Project Doc Link</th>
          <th class="col-actions">Actions</th>
        </tr>
      </thead>
      <tbody>${data.map(initiativeRow).join('')}</tbody>
    </table>
  `;
  document.getElementById('doSearch').onclick = () => {
    const v = document.getElementById('search').value;
    const url = new URL(location.href);
    if (v) url.searchParams.set('q', v); else url.searchParams.delete('q');
    ['departmentId','priority','status','milestone'].forEach(k=>{
      const elId = { departmentId:'fDepartment', priority:'fPriority', status:'fStatus', milestone:'fMilestone' }[k];
      const val = document.getElementById(elId).value;
      if (val) url.searchParams.set(k, val); else url.searchParams.delete(k);
    });
    history.pushState({}, '', url);
    renderList();
  };
  // Filter change events
  ['fDepartment','fPriority','fStatus','fMilestone'].forEach(id => {
    const el = document.getElementById(id);
    el.onchange = () => document.getElementById('doSearch').click();
  });
  // Sorting
  document.querySelectorAll('thead th.sortable').forEach(th => {
    const resizer = document.createElement('span');
    resizer.className = 'col-resize';
    th.appendChild(resizer);
    th.onclick = (e) => {
      if (e.target === resizer) return; // ignore when resizing
      const key = th.dataset.key;
      const url = new URL(location.href);
      const current = url.searchParams.get('sort') || '';
      const [curKey, curDir] = current.split(':');
      const nextDir = curKey === key && curDir === 'asc' ? 'desc' : 'asc';
      url.searchParams.set('sort', `${key}:${nextDir}`);
      history.pushState({}, '', url);
      renderList();
    };
    // Resize behavior
    let startX = 0; let startWidth = 0;
    resizer.onmousedown = (ev) => {
      startX = ev.clientX;
      startWidth = th.offsetWidth;
      document.onmousemove = (mv) => {
        const dx = mv.clientX - startX;
        th.style.width = Math.max(80, startWidth + dx) + 'px';
      };
      document.onmouseup = () => { document.onmousemove = null; document.onmouseup = null; };
    };
  });
  document.querySelectorAll('button.delete').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Delete this initiative?')) return;
      await fetch(`/api/initiatives/${btn.dataset.id}`, { method: 'DELETE' });
      renderList();
    };
  });
  document.querySelectorAll('button.view').forEach(btn => {
    btn.onclick = () => location.hash = `#view/${btn.dataset.id}`;
  });
}

function formRow(label, inputHtml) {
  return `<div class="form-row"><label>${label}</label><div>${inputHtml}</div></div>`;
}

function commonFields() {
  return [
    formRow('Type', `<select name="type" required><option selected>Project</option><option>CR</option></select>`),
    formRow('Initiative Name', `<input name="name" required />`),
    formRow('Description', `<textarea name="description" required></textarea>`),
    formRow('Business Impact', `<textarea name="businessImpact" required></textarea>`),
    formRow('Priority', `<select name="priority"><option>P0</option><option>P1</option><option>P2</option></select>`),
    formRow('Business Owner / Requestor', `<input name="businessOwnerId" required />`),
    formRow('Department', `<input name="departmentId" required />`),
    formRow('IT PIC', `<input name="itPicId" required />`),
    formRow('Status', `<select name="status">
      <option>Not Started</option><option>On Hold</option><option>On Track</option><option>At Risk</option><option>Delayed</option><option>Live</option><option>Cancelled</option>
    </select>`),
    formRow('Milestone', `<select name="milestone">
      <option>Pre-grooming</option><option>Grooming</option><option>Tech Assessment</option><option>Planning</option><option>Development</option><option>Testing</option><option>Live</option>
    </select>`),
    formRow('Start Date', `<input type="date" name="startDate" />`),
    formRow('End Date', `<input type="date" name="endDate" />`),
    formRow('Remark', `<input name="remark" />`),
    formRow('Project Doc Link', `<input name="documentationLink" type="url" />`),
    formRow('Documents', `<input type="file" name="documents" id="documents" multiple accept=".pdf,.doc,.docx,.xls,.xlsx,.txt,.png,.jpg,.jpeg" />
      <div id="filePreview" style="margin-top: 10px;"></div>
      <small style="color: #666;">You can select multiple files. Max 10MB per file.</small>`)
  ].join('');
}

function crFields() {
  return `
    <div id="crFields">
      ${formRow('CR Submission Start', `<input type="date" name="cr.crSubmissionStart" />`)}
      ${formRow('CR Submission End', `<input type="date" name="cr.crSubmissionEnd" />`)}
      ${formRow('Development Start', `<input type="date" name="cr.developmentStart" />`)}
      ${formRow('Development End', `<input type="date" name="cr.developmentEnd" />`)}
      ${formRow('SIT Start', `<input type="date" name="cr.sitStart" />`)}
      ${formRow('SIT End', `<input type="date" name="cr.sitEnd" />`)}
      ${formRow('UAT Start', `<input type="date" name="cr.uatStart" />`)}
      ${formRow('UAT End', `<input type="date" name="cr.uatEnd" />`)}
      ${formRow('Live Date', `<input type="date" name="cr.liveDate" />`)}
    </div>`;
}

async function renderNew() {
  setActive('#new');
  app.innerHTML = `
    <div class="card">
      <h2>New Initiative</h2>
      <form id="f" class="form">
        ${commonFields()}
        <div id="crContainer" class="card" style="display:none">
          <h3>CR Details</h3>
          ${crFields()}
        </div>
        <div>
          <button class="primary" type="submit">Create</button>
          <a href="#list"><button type="button">Cancel</button></a>
        </div>
      </form>
      <div class="muted">Note: For CR, CR Submission Start is required.</div>
    </div>
  `;
  const f = document.getElementById('f');
  const typeEl = f.querySelector('select[name="type"]');
  const crBox = document.getElementById('crContainer');
  typeEl.onchange = () => {
    crBox.style.display = typeEl.value === 'CR' ? 'block' : 'none';
  };
  typeEl.onchange();
  // Compression function for images
  async function compressImage(file, maxSizeKB = 500) {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;
          let quality = 0.9;
          
          // Calculate initial dimensions to get close to target size
          const maxDimension = 2000; // Max width/height
          if (width > maxDimension || height > maxDimension) {
            if (width > height) {
              height = (height / width) * maxDimension;
              width = maxDimension;
            } else {
              width = (width / height) * maxDimension;
              height = maxDimension;
            }
          }
          
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, 0, 0, width, height);
          
          // Try to compress to target size
          const tryCompress = (q) => {
            canvas.toBlob((blob) => {
              if (!blob) {
                resolve(file); // Fallback to original
                return;
              }
              
              const sizeKB = blob.size / 1024;
              if (sizeKB <= maxSizeKB || q <= 0.1) {
                // Create a new File object with the compressed blob
                const compressedFile = new File([blob], file.name, {
                  type: file.type,
                  lastModified: Date.now()
                });
                resolve(compressedFile);
              } else {
                // Reduce quality and try again
                tryCompress(Math.max(0.1, q - 0.1));
              }
            }, file.type, q);
          };
          
          tryCompress(quality);
        };
        img.onerror = () => resolve(file); // Fallback to original on error
        img.src = e.target.result;
      };
      reader.onerror = () => resolve(file); // Fallback to original on error
      reader.readAsDataURL(file);
    });
  }
  
  // Compress file if needed
  async function compressFileIfNeeded(file) {
    const maxSizeKB = 500;
    const fileSizeKB = file.size / 1024;
    
    // Only compress if file is larger than 500KB
    if (fileSizeKB <= maxSizeKB) {
      return file;
    }
    
    // Check if it's an image
    const imageTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (imageTypes.includes(file.type.toLowerCase())) {
      return await compressImage(file, maxSizeKB);
    }
    
    // For non-image files, return as-is (could add other compression methods later)
    return file;
  }
  
  // File preview functionality
  const fileInput = document.getElementById('documents');
  const filePreview = document.getElementById('filePreview');
  const selectedFiles = [];
  const compressionInfo = []; // Track compression info (parallel array to selectedFiles)
  
    fileInput.onchange = async (e) => {
    const files = Array.from(e.target.files);
    selectedFiles.length = 0;
    compressionInfo.length = 0;
    
    // Process and compress files
    filePreview.innerHTML = '<div style="margin-top: 8px;"><strong>Processing files...</strong></div>';
    
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const originalSize = file.size;
      const compressed = await compressFileIfNeeded(file);
      selectedFiles.push(compressed);
      
      if (compressed.size < originalSize) {
        compressionInfo.push({ original: originalSize, compressed: compressed.size });
      } else {
        compressionInfo.push(null);
      }
    }
    
    // Display file preview
    if (selectedFiles.length > 0) {
      filePreview.innerHTML = '<div style="margin-top: 8px;"><strong>Selected files:</strong></div>' +
        selectedFiles.map((file, index) => {
          const compInfo = compressionInfo[index];
          const sizeDisplay = compInfo 
            ? `<span style="color: #666; font-size: 0.9em;">${(file.size / 1024).toFixed(1)} KB <span style="color: #28a745;">(compressed from ${(compInfo.original / 1024).toFixed(1)} KB)</span></span>`
            : `<span style="color: #666; font-size: 0.9em;">(${(file.size / 1024).toFixed(1)} KB)</span>`;
          
          return `
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px; padding: 4px; background: #f5f5f5; border-radius: 4px;">
              <span>📄 ${file.name}</span>
              ${sizeDisplay}
              <button type="button" onclick="removeFile(${index})" style="margin-left: auto; background: #ff4444; color: white; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer;">Remove</button>
            </div>
          `;
        }).join('');
    } else {
      filePreview.innerHTML = '';
    }
  };
  
  // Global function to remove files
  window.removeFile = (index) => {
    // Remove from arrays (parallel arrays stay in sync)
    selectedFiles.splice(index, 1);
    compressionInfo.splice(index, 1);
    
    // Update file input
    const dt = new DataTransfer();
    selectedFiles.forEach(file => dt.items.add(file));
    fileInput.files = dt.files;
    
    // Rebuild preview display
    if (selectedFiles.length > 0) {
      filePreview.innerHTML = '<div style="margin-top: 8px;"><strong>Selected files:</strong></div>' +
        selectedFiles.map((file, newIndex) => {
          const compInfo = compressionInfo[newIndex];
          const sizeDisplay = compInfo 
            ? `<span style="color: #666; font-size: 0.9em;">${(file.size / 1024).toFixed(1)} KB <span style="color: #28a745;">(compressed from ${(compInfo.original / 1024).toFixed(1)} KB)</span></span>`
            : `<span style="color: #666; font-size: 0.9em;">(${(file.size / 1024).toFixed(1)} KB)</span>`;
          
          return `
            <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px; padding: 4px; background: #f5f5f5; border-radius: 4px;">
              <span>📄 ${file.name}</span>
              ${sizeDisplay}
              <button type="button" onclick="removeFile(${newIndex})" style="margin-left: auto; background: #ff4444; color: white; border: none; padding: 2px 8px; border-radius: 3px; cursor: pointer;">Remove</button>
            </div>
          `;
        }).join('');
    } else {
      filePreview.innerHTML = '';
    }
  };
  
  f.onsubmit = async (e) => {
    e.preventDefault();
    const fd = new FormData(f);
    const obj = Object.fromEntries(fd.entries());
    const payload = {
      type: obj.type,
      name: obj.name,
      description: obj.description,
      businessImpact: obj.businessImpact,
      priority: obj.priority,
      businessOwnerId: obj.businessOwnerId,
      departmentId: obj.departmentId,
      itPicId: obj.itPicId,
      status: obj.status,
      milestone: obj.milestone,
      startDate: obj.startDate,
      endDate: obj.endDate || null,
      remark: obj.remark || null,
      documentationLink: obj.documentationLink || null
    };
    if (obj.type === 'CR') {
      payload.cr = {
        crSubmissionStart: obj['cr.crSubmissionStart'] || null,
        crSubmissionEnd: obj['cr.crSubmissionEnd'] || null,
        developmentStart: obj['cr.developmentStart'] || null,
        developmentEnd: obj['cr.developmentEnd'] || null,
        sitStart: obj['cr.sitStart'] || null,
        sitEnd: obj['cr.sitEnd'] || null,
        uatStart: obj['cr.uatStart'] || null,
        uatEnd: obj['cr.uatEnd'] || null,
        liveDate: obj['cr.liveDate'] || null
      };
    }
    try {
      // Create the initiative first
      const result = await fetchJSON('/api/initiatives', { 
        method:'POST', 
        headers:{'Content-Type':'application/json'}, 
        body: JSON.stringify(payload) 
      });
      
      const initiativeId = result.id;
      
      // Upload documents if any files were selected
      if (selectedFiles.length > 0) {
        const token = localStorage.getItem('token');
        const uploadPromises = selectedFiles.map(async (file) => {
          const formData = new FormData();
          formData.append('file', file);
          formData.append('initiativeId', initiativeId);
          
          const uploadRes = await fetch('/api/documents', {
            method: 'POST',
            headers: token ? { 'Authorization': `Bearer ${token}` } : {},
            body: formData
          });
          
          if (!uploadRes.ok) {
            const errorText = await uploadRes.text().catch(() => '');
            throw new Error(`Failed to upload ${file.name}: ${errorText || uploadRes.statusText}`);
          }
          
          return uploadRes.json();
        });
        
        try {
          await Promise.all(uploadPromises);
        } catch (uploadError) {
          console.error('Error uploading documents:', uploadError);
          alert(`Initiative created successfully, but some documents failed to upload: ${uploadError.message}`);
        }
      }
      
      location.hash = '#list';
      renderList();
    } catch (e) {
      alert(e.message);
    }
  };
}

async function renderView(id) {
  setActive('#list');
  await ensureLookups();
  const i = await fetchJSON('/api/initiatives/' + id);
  const boName = nameById(LOOKUPS.users, i.businessOwnerId);
  const depName = nameById(LOOKUPS.departments, i.departmentId);
  const itPicName = nameById(LOOKUPS.users, i.itPicId);
  
  // Calculate aging
  const createDate = new Date(i.createdAt || i.startDate);
  const now = new Date();
  const daysSinceCreated = Math.floor((now - createDate) / (1000 * 60 * 60 * 24));
  
  app.innerHTML = `
    <div class="card">
      <h2>${i.name}</h2>
      <div class="grid">
        <div><div class="muted">Ticket</div><div>${i.ticket || i.id}</div></div>
        <div><div class="muted">Type</div><div>${i.type}</div></div>
        <div><div class="muted">Create Date</div><div>${i.createdAt?.slice(0,10) || ''}</div></div>
        <div><div class="muted">Priority</div><div><span class="priority-badge priority-${i.priority}">${i.priority}</span></div></div>
        <div><div class="muted">Status</div><div><span class="status-badge status-${i.status?.replace(/\s+/g, '-')}">${i.status}</span></div></div>
        <div><div class="muted">Milestone</div><div>${i.milestone}</div></div>
        <div><div class="muted">Department</div><div>${depName}</div></div>
        <div><div class="muted">IT PIC</div><div>${itPicName}</div></div>
        <div><div class="muted">Business Owner / Requestor</div><div>${boName}</div></div>
        <div><div class="muted">Start Date</div><div>${i.startDate?.slice(0,10) || ''}</div></div>
        <div><div class="muted">End Date</div><div>${i.endDate?.slice(0,10) || ''}</div></div>
        <div><div class="muted">Age Since Created</div><div><strong>${daysSinceCreated} days</strong></div></div>
        <div style="grid-column: 1 / -1"><div class="muted">Description</div><div>${i.description || ''}</div></div>
        <div style="grid-column: 1 / -1"><div class="muted">Business Impact</div><div>${i.businessImpact || ''}</div></div>
        <div style="grid-column: 1 / -1"><div class="muted">Remark</div><div>${i.remark || ''}</div></div>
        <div style="grid-column: 1 / -1"><div class="muted">Project Doc Link</div><div>${i.documentationLink ? `<a href="${i.documentationLink}" target="_blank">${i.documentationLink}</a>` : ''}</div></div>
      </div>
      ${i.type === 'CR' ? `
        <h3>CR Dates</h3>
        <div class="grid">
          <div><div class="muted">Submission</div><div>${i.cr?.crSubmissionStart || ''} → ${i.cr?.crSubmissionEnd || ''}</div></div>
          <div><div class="muted">Development</div><div>${i.cr?.developmentStart || ''} → ${i.cr?.developmentEnd || ''}</div></div>
          <div><div class="muted">SIT</div><div>${i.cr?.sitStart || ''} → ${i.cr?.sitEnd || ''}</div></div>
          <div><div class="muted">UAT</div><div>${i.cr?.uatStart || ''} → ${i.cr?.uatEnd || ''}</div></div>
          <div><div class="muted">Live</div><div>${i.cr?.liveDate || ''}</div></div>
        </div>
      ` : ''}
      ${i.changeHistory && i.changeHistory.length > 0 ? `
        <h3>Change History</h3>
        <div class="card" style="margin-top: 16px;">
          ${i.changeHistory.map(history => `
            <div style="margin-bottom: 16px; padding-bottom: 16px; border-bottom: 1px solid #f1f5f9;">
              <div class="muted" style="font-size: 12px;">${history.timestamp.slice(0,19).replace('T', ' ')} by ${history.changedBy}</div>
              ${history.changes.map(change => `
                <div style="margin: 8px 0; padding: 8px; background: #f8fafc; border-radius: 6px;">
                  <strong>${change.field}:</strong> 
                  <span style="color: #ef4444;">${change.oldValue || 'empty'}</span> → 
                  <span style="color: #10b981;">${change.newValue || 'empty'}</span>
                </div>
              `).join('')}
            </div>
          `).join('')}
        </div>
      ` : ''}
      <div style="margin-top:12px"><a href="#list"><button>Back</button></a></div>
    </div>
  `;
}

async function renderCRList() {
  console.log('renderCRList called');
  setActive('#crlist');
  try {
    await ensureLookups();
    console.log('Lookups loaded successfully for CR List');
  } catch (error) {
    console.error('Error loading lookups for CR List:', error);
    app.innerHTML = `<div class="error">Error loading lookups: ${error.message}</div>`;
    return;
  }
  const urlParams = new URLSearchParams(location.search);
  const q = urlParams.get('q') || '';
  const filter = {
    departmentId: urlParams.get('departmentId') || '',
    priority: urlParams.get('priority') || '',
    status: urlParams.get('status') || '',
    milestone: urlParams.get('milestone') || ''
  };
  const sortParam = urlParams.get('sort') || '';
  const apiQs = new URLSearchParams({ ...(q ? { q } : {}), ...Object.fromEntries(Object.entries(filter).filter(([,v]) => v)) });
  let data;
  try {
    data = await fetchJSON('/api/initiatives' + (apiQs.toString() ? `?${apiQs.toString()}&type=CR` : '?type=CR'));
  } catch (e) {
    console.error('Failed to fetch CR initiatives:', e);
    app.innerHTML = `<div class="error">Failed to load CR initiatives: ${e.message}</div>`;
    return;
  }
  
  // CR data is now included in the API response
  const dataWithCR = data.map(initiative => ({
    initiative,
    crData: initiative.cr
  }));
  if (sortParam) {
    const [key, dir] = sortParam.split(':');
    const dirMul = dir === 'desc' ? -1 : 1;
    const nameFor = (keyName, id) => {
      if (keyName === 'departmentId') return nameById(LOOKUPS.departments, id);
      if (keyName === 'businessOwnerId' || keyName === 'itPicId') return nameById(LOOKUPS.users, id);
      return id || '';
    };
    dataWithCR.sort((a,b) => {
      const va = (key.endsWith('Id') ? nameFor(key, a.initiative[key]) : a.initiative[key]) || '';
      const vb = (key.endsWith('Id') ? nameFor(key, b.initiative[key]) : b.initiative[key]) || '';
      return String(va).localeCompare(String(vb)) * dirMul;
    });
  }
  app.innerHTML = `
    <div class="toolbar">
      <input id="search" placeholder="Search name or description" value="${q}">
      <button id="doSearch">Search</button>
      <select id="fDepartment"><option value="">Department</option>${LOOKUPS.departments.map(d => `<option value="${d.id}" ${filter.departmentId===d.id?'selected':''}>${d.name}</option>`).join('')}</select>
      <select id="fPriority"><option value="">Priority</option><option ${filter.priority==='P0'?'selected':''}>P0</option><option ${filter.priority==='P1'?'selected':''}>P1</option><option ${filter.priority==='P2'?'selected':''}>P2</option></select>
      <select id="fStatus"><option value="">Status</option>${['Not Started','On Hold','On Track','At Risk','Delayed','Live','Cancelled'].map(s=>`<option ${filter.status===s?'selected':''}>${s}</option>`).join('')}</select>
      <select id="fMilestone"><option value="">Milestone</option>${['Pre-grooming','Grooming','Tech Assessment','Planning','Development','Testing','Live'].map(m=>`<option ${filter.milestone===m?'selected':''}>${m}</option>`).join('')}</select>
      <a href="#new"><button class="primary">New CR</button></a>
    </div>
    <table>
      <thead>
        <tr>
          <th class="sortable col-ticket" data-key="ticket">Ticket</th>
          <th class="sortable col-name" data-key="name">CR Name</th>
          <th class="sortable col-priority" data-key="priority">Priority</th>
          <th class="sortable col-status" data-key="status">Status</th>
          <th class="sortable col-milestone" data-key="milestone">Milestone</th>
          <th class="sortable col-department" data-key="departmentId">Department</th>
          <th class="sortable col-owner" data-key="businessOwnerId">Business Owner</th>
          <th class="sortable col-pic" data-key="itPicId">IT PIC</th>
          <th class="sortable col-date" data-key="startDate">Start Date</th>
          <th class="sortable col-date" data-key="createdAt">Create Date</th>
          <th class="sortable col-date" data-key="endDate">End Date</th>
          <th class="col-impact">Business Impact</th>
          <th class="col-remark">Remark</th>
          <th class="col-doc">CR Doc Link</th>
          <th class="col-timeline">CR Timeline</th>
          <th class="col-actions">Actions</th>
        </tr>
      </thead>
      <tbody>${dataWithCR.map(item => initiativeRow(item.initiative, item.crData)).join('')}</tbody>
    </table>
  `;
  document.getElementById('doSearch').onclick = () => {
    const v = document.getElementById('search').value;
    const url = new URL(location.href);
    if (v) url.searchParams.set('q', v); else url.searchParams.delete('q');
    ['departmentId','priority','status','milestone'].forEach(k=>{
      const elId = { departmentId:'fDepartment', priority:'fPriority', status:'fStatus', milestone:'fMilestone' }[k];
      const val = document.getElementById(elId).value;
      if (val) url.searchParams.set(k, val); else url.searchParams.delete(k);
    });
    history.pushState({}, '', url);
    renderCRList();
  };
  // Filter change events
  ['fDepartment','fPriority','fStatus','fMilestone'].forEach(id => {
    const el = document.getElementById(id);
    el.onchange = () => document.getElementById('doSearch').click();
  });
  // Sorting
  document.querySelectorAll('thead th.sortable').forEach(th => {
    const resizer = document.createElement('span');
    resizer.className = 'col-resize';
    th.appendChild(resizer);
    th.onclick = (e) => {
      if (e.target === resizer) return; // ignore when resizing
      const key = th.dataset.key;
      const url = new URL(location.href);
      const current = url.searchParams.get('sort') || '';
      const [curKey, curDir] = current.split(':');
      const nextDir = curKey === key && curDir === 'asc' ? 'desc' : 'asc';
      url.searchParams.set('sort', `${key}:${nextDir}`);
      history.pushState({}, '', url);
      renderCRList();
    };
    // Resize behavior
    let startX = 0; let startWidth = 0;
    resizer.onmousedown = (ev) => {
      startX = ev.clientX;
      startWidth = th.offsetWidth;
      document.onmousemove = (mv) => {
        const dx = mv.clientX - startX;
        th.style.width = Math.max(80, startWidth + dx) + 'px';
      };
      document.onmouseup = () => { document.onmousemove = null; document.onmouseup = null; };
    };
  });
  document.querySelectorAll('button.delete').forEach(btn => {
    btn.onclick = async () => {
      if (!confirm('Delete this CR?')) return;
      await fetch(`/api/initiatives/${btn.dataset.id}`, { method: 'DELETE' });
      renderCRList();
    };
  });
  document.querySelectorAll('button.view').forEach(btn => {
    btn.onclick = () => location.hash = `#view/${btn.dataset.id}`;
  });
}

async function renderDashboard() {
  setActive('#dashboard');
  await ensureLookups();
  const d = await fetchJSON('/api/dashboard');
  
  // Create simple bar charts
  const createBarChart = (data, labelKey, valueKey, title) => {
    const max = Math.max(...data.map(item => item[valueKey]));
    return `
      <div class="card">
        <h3>${title}</h3>
        <div style="margin-top: 16px;">
          ${data.map(item => {
            const percentage = (item[valueKey] / max) * 100;
            const statusClass = item[labelKey]?.replace(/\s+/g, '-') || '';
            return `
              <div style="display: flex; align-items: center; margin-bottom: 12px;">
                <div style="width: 120px; font-size: 12px; color: var(--muted);">${item[labelKey]}</div>
                <div style="flex: 1; margin: 0 12px;">
                  <div style="background: #f1f5f9; height: 20px; border-radius: 10px; overflow: hidden;">
                    <div style="background: ${statusClass.includes('Live') ? '#3b82f6' : statusClass.includes('At-Risk') ? '#f59e0b' : statusClass.includes('Delayed') ? '#ef4444' : '#6366f1'}; height: 100%; width: ${percentage}%; transition: width 0.3s;"></div>
                  </div>
                </div>
                <div style="width: 40px; text-align: right; font-weight: 600; font-size: 14px;">${item[valueKey]}</div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  };
  
  app.innerHTML = `
    <div class="kpis">
      <div class="card">
        <div class="muted">Total Projects</div>
        <div style="font-size:32px;font-weight:700;color: var(--brand)">${d.projects}</div>
      </div>
      <div class="card">
        <div class="muted">Live Projects</div>
        <div style="font-size:32px;font-weight:700;color: var(--success)">${d.liveYTD}</div>
      </div>
      <div class="card">
        <div class="muted">Avg Age (Days)</div>
        <div style="font-size:32px;font-weight:700;color: var(--warning)">${d.avgAgeSinceCreated}</div>
      </div>
    </div>
    <div class="grid" style="margin-top:24px">
      ${createBarChart(d.byStatus, 'status', 'c', 'Status Distribution')}
      ${createBarChart(d.byPriority, 'priority', 'c', 'Priority Distribution')}
      <div class="card">
        <h3>Project Aging (Days Since Created)</h3>
        <div style="margin-top: 16px; max-height: 400px; overflow-y: auto;">
          ${d.projectAging.map(project => `
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 8px; background: #f8fafc; border-radius: 6px;">
              <div style="flex: 1;">
                <div style="font-weight: 500; margin-bottom: 4px;">${project.name}</div>
                <div style="font-size: 12px; color: var(--muted);">
                  <span class="status-badge status-${project.status?.replace(/\s+/g, '-')}">${project.status}</span>
                  <span style="margin-left: 8px;">${project.milestone}</span>
                </div>
              </div>
              <div style="text-align: right;">
                <span style="font-weight: 600; color: var(--warning);">${project.daysSinceCreated} days</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
    <div class="grid" style="margin-top:24px">
      <div class="card">
        <h3>Project Milestone Timeline (Based on Daily Logs)</h3>
        <div style="margin-top: 16px; max-height: 500px; overflow-y: auto;">
          ${d.milestoneDurations.map(project => `
            <div style="margin-bottom: 20px; padding: 16px; background: #f8fafc; border-radius: 8px; border-left: 4px solid var(--brand);">
              <div style="font-weight: 700; margin-bottom: 8px; color: var(--brand); font-size: 16px;">${project.name}</div>
              <div style="font-size: 12px; color: var(--muted); margin-bottom: 12px;">
                Current: <span class="status-badge status-${project.currentMilestone?.replace(/\s+/g, '-')}">${project.currentMilestone}</span>
              </div>
              <div style="display: grid; gap: 8px;">
                ${project.milestoneDetails.map(milestone => `
                  <div style="padding: 12px; background: white; border-radius: 6px; border: 1px solid #e2e8f0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                      <span style="font-weight: 600; color: var(--text);">${milestone.milestone}</span>
                      <span style="padding: 2px 8px; border-radius: 12px; font-size: 10px; font-weight: 600; text-transform: uppercase; 
                        background: ${milestone.status === 'Current' ? '#dbeafe' : '#d1fae5'}; 
                        color: ${milestone.status === 'Current' ? '#1e40af' : '#065f46'};">
                        ${milestone.status}
                      </span>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 8px; font-size: 11px; color: var(--muted);">
                      <div>
                        <strong>Start:</strong> ${milestone.startDate}
                      </div>
                      <div>
                        <strong>End:</strong> ${milestone.endDate || 'Ongoing'}
                      </div>
                      <div>
                        <strong>Duration:</strong> <span style="color: var(--warning); font-weight: 600;">${milestone.duration} days</span>
                      </div>
                    </div>
                    ${milestone.changedBy ? `
                      <div style="margin-top: 6px; font-size: 10px; color: var(--muted); border-top: 1px solid #f1f5f9; padding-top: 6px;">
                        Changed by: ${milestone.changedBy} on ${milestone.changedAt ? milestone.changedAt.slice(0, 10) : 'Unknown'}
                      </div>
                    ` : ''}
                  </div>
                `).join('')}
              </div>
            </div>
          `).join('')}
        </div>
      </div>
      <div class="card">
        <h3>Department Distribution</h3>
        <div style="margin-top: 16px;">
          ${d.byDepartment.map(item => {
            const deptName = nameById(LOOKUPS.departments, item.departmentId);
            return `
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; padding: 8px; background: #f8fafc; border-radius: 6px;">
                <span style="font-weight: 500;">${deptName}</span>
                <span style="font-weight: 600;">${item.c}</span>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    </div>
  `;
}

function router() {
  const h = location.hash || '#list';
  console.log('Router called with hash:', h);
  console.log('Current URL:', window.location.href);
  
  // Add immediate feedback to see if router is working
  app.innerHTML = `<div style="padding: 20px; background: #f0f0f0; border: 1px solid #ccc;">Router called with hash: ${h}. Loading...</div>`;
  
  try {
    if (h.startsWith('#new')) return renderNew();
    if (h.startsWith('#view/')) return renderView(h.split('/')[1]);
    if (h.startsWith('#dashboard')) return renderDashboard();
    if (h.startsWith('#crlist')) return renderCRList();
    return renderList();
  } catch (error) {
    console.error('Router error:', error);
    app.innerHTML = `<div class="error">Error loading page: ${error.message}</div>`;
  }
}

window.addEventListener('hashchange', router);
router();


