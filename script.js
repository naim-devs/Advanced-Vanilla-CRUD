
// data model and storage
const KEY = 'crud-demo:v1'
let state = { items: [], page: 1, perPage: 5, query: '', sort: 'createdAt:desc', selected: new Set() }

function uid(){ return Date.now().toString(36) + Math.random().toString(36).slice(2,8) }

function load(){
  try{ const raw = localStorage.getItem(KEY); state.items = raw? JSON.parse(raw): [] }
  catch(e){ state.items = [] }
}
function save(){ localStorage.setItem(KEY, JSON.stringify(state.items)) }

// seeded demo if empty
function seedIfEmpty(){ if(state.items.length) return; const demo = [
  {id:uid(), name:'Rahim', email:'rahim@example.com', role:'admin', createdAt:Date.now()-86400000},
  {id:uid(), name:'Karim', email:'karim@example.com', role:'user', createdAt:Date.now()-3600000},
  {id:uid(), name:'Tanu', email:'tanu@example.com', role:'guest', createdAt:Date.now()-100000}
]; state.items = demo; save() }

// utils
function formatDate(ts){ const d=new Date(ts); return d.toLocaleString() }

function queryAndSort(items){
  const q = state.query.trim().toLowerCase()
  let out = items.filter(it=>{ if(!q) return true; return it.name.toLowerCase().includes(q) || it.email.toLowerCase().includes(q) })
  const [key,dir] = state.sort.split(':')
  out.sort((a,b)=>{
    if(key==='createdAt') return dir==='asc' ? a.createdAt - b.createdAt : b.createdAt - a.createdAt
    const A = (a[key]||'').toLowerCase(); const B=(b[key]||'').toLowerCase()
    if(A<B) return dir==='asc' ? -1:1; if(A>B) return dir==='asc'?1:-1; return 0
  })
  return out
}

// render
function render(){
  const tbody = document.getElementById('list')
  const countEl = document.getElementById('count')
  const pageEl = document.getElementById('page')
  const perPage = parseInt(state.perPage)

  const filtered = queryAndSort(state.items)
  const total = filtered.length
  const pages = Math.max(1, Math.ceil(total / perPage))
  if(state.page>pages) state.page = pages
  const start = (state.page-1)*perPage
  const pageItems = filtered.slice(start, start+perPage)

  countEl.textContent = total
  pageEl.textContent = state.page

  tbody.innerHTML = pageItems.map(it => {
    const checked = state.selected.has(it.id) ? 'checked' : ''
    return `
      <tr data-id="${it.id}">
        <td><input type="checkbox" data-id="${it.id}" ${checked} class="rowChk"></td>
        <td><strong>${escapeHtml(it.name)}</strong></td>
        <td><span class="muted">${escapeHtml(it.email)}</span></td>
        <td><span class="badge">${escapeHtml(it.role)}</span></td>
        <td>${formatDate(it.createdAt)}</td>
        <td>
          <div class="actions">
            <button class="btn small" data-act="edit" data-id="${it.id}">Edit</button>
            <button class="btn ghost small" data-act="copy" data-id="${it.id}">Copy</button>
            <button class="btn warn small" data-act="delete" data-id="${it.id}">Delete</button>
          </div>
        </td>
      </tr>
    `
  }).join('')

  document.getElementById('selectAll').checked = pageItems.length>0 && pageItems.every(i=>state.selected.has(i.id))
}

// escape
function escapeHtml(s){ return String(s).replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":"&#39;"})[c]) }

// actions
function addItem(data){ data.id = uid(); data.createdAt = Date.now(); state.items.push(data); save(); render() }
function updateItem(id, updates){ const i = state.items.find(x=>x.id===id); if(!i) return; Object.assign(i, updates); save(); render() }
function deleteItem(id){ state.items = state.items.filter(x=>x.id!==id); state.selected.delete(id); save(); render() }

// bulk
function bulkDelete(){ if(!confirm('Selected items delete?')) return; state.items = state.items.filter(x=>!state.selected.has(x.id)); state.selected.clear(); save(); render() }

// export CSV
function exportCSV(){ const rows = [['id','name','email','role','createdAt']].concat(state.items.map(i=>[i.id,i.name,i.email,i.role,new Date(i.createdAt).toISOString()])); const csv = rows.map(r=>r.map(cell=>`"${String(cell).replace(/"/g,'""') }"`).join(',')).join('\n'); const blob = new Blob([csv], {type:'text/csv'}); const url = URL.createObjectURL(blob); const a=document.createElement('a'); a.href=url; a.download='export.csv'; a.click(); URL.revokeObjectURL(url) }

// event wiring
document.addEventListener('DOMContentLoaded', ()=>{
  load(); seedIfEmpty();

  const form = document.getElementById('itemForm')
  const name = document.getElementById('name')
  const email = document.getElementById('email')
  const role = document.getElementById('role')

  const editBackdrop = document.getElementById('modalBackdrop')
  const editForm = document.getElementById('editForm')
  const editName = document.getElementById('editName')
  const editEmail = document.getElementById('editEmail')
  const editRole = document.getElementById('editRole')
  let editingId = null

  render()

  form.addEventListener('submit', e=>{
    e.preventDefault();
    const nv = name.value.trim(); const ev = email.value.trim();
    if(!nv || !validateEmail(ev)){ alert('Name and valid email required'); return }
    addItem({name:nv,email:ev,role:role.value}); form.reset(); name.focus()
  })

  document.getElementById('resetBtn').addEventListener('click', ()=>{ form.reset(); name.focus() })

  document.getElementById('search').addEventListener('input', e=>{ state.query = e.target.value; state.page = 1; render() })
  document.getElementById('perPage').addEventListener('change', e=>{ state.perPage = e.target.value; state.page = 1; render() })
  document.getElementById('sortBy').addEventListener('change', e=>{ state.sort = e.target.value; render() })

  document.getElementById('prev').addEventListener('click', ()=>{ if(state.page>1){ state.page--; render() } })
  document.getElementById('next').addEventListener('click', ()=>{ const total = queryAndSort(state.items).length; const pages = Math.max(1, Math.ceil(total / state.perPage)); if(state.page<pages){ state.page++; render() } })

  document.getElementById('exportCsv').addEventListener('click', exportCSV)
  document.getElementById('clearAll').addEventListener('click', ()=>{ if(!confirm('Clear all stored items?')) return; state.items=[]; state.selected.clear(); save(); render() })
  document.getElementById('bulkDelete').addEventListener('click', bulkDelete)

  // table delegation
  document.getElementById('list').addEventListener('click', e=>{
    const act = e.target.closest('[data-act]')?.dataset.act
    const id = e.target.closest('[data-id]')?.dataset.id
    if(!act || !id) return
    if(act==='edit'){ openEdit(id) }
    if(act==='delete'){ if(confirm('Delete this item?')) deleteItem(id) }
    if(act==='copy'){ const it = state.items.find(x=>x.id===id); if(it){ navigator.clipboard?.writeText(JSON.stringify(it)) ; alert('Copied JSON to clipboard') } }
  })

  // checkbox handling
  document.getElementById('list').addEventListener('change', e=>{
    if(e.target.classList.contains('rowChk')){
      const id = e.target.dataset.id
      if(e.target.checked) state.selected.add(id); else state.selected.delete(id)
      render()
    }
  })
  document.getElementById('selectAll').addEventListener('change', e=>{
    const checked = e.target.checked
    const trs = Array.from(document.querySelectorAll('#list tr'))
    trs.forEach(tr=>{ const id = tr.dataset.id; if(!id) return; if(checked) state.selected.add(id); else state.selected.delete(id) })
    render()
  })

  // edit modal
  function openEdit(id){ const it = state.items.find(x=>x.id===id); if(!it) return; editingId = id; document.getElementById('modalTitle').textContent='Edit User'; editName.value=it.name; editEmail.value=it.email; editRole.value=it.role; editBackdrop.style.display='flex'; editName.focus() }
  document.getElementById('cancelEdit').addEventListener('click', ()=>{ editBackdrop.style.display='none'; editingId=null })
  editForm.addEventListener('submit', e=>{ e.preventDefault(); if(!editingId) return; if(!editName.value.trim()||!validateEmail(editEmail.value.trim())){ alert('Valid name & email required'); return } updateItem(editingId,{ name: editName.value.trim(), email: editEmail.value.trim(), role: editRole.value }); editBackdrop.style.display='none'; editingId=null })

  // keyboard shortcuts
  document.addEventListener('keydown', e=>{
    if(e.key==='/' && document.activeElement.tagName!=='INPUT') { e.preventDefault(); document.getElementById('search').focus() }
    if(e.key==='n' && (e.ctrlKey||e.metaKey)) { e.preventDefault(); name.focus() }
  })

  // helper
  function validateEmail(v){ return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v) }

})

