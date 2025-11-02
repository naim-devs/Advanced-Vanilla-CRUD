/**
 * @file Manages the entire CRUD application logic.
 * @description This script handles user data management (Create, Read, Update, Delete)
 * using LocalStorage. It includes features like searching, sorting, pagination,
 * bulk actions, CSV export, and a custom-styled select dropdown component.
 * All operations are performed on the client-side without a backend.
 */

document.addEventListener('DOMContentLoaded', () => {

    //==========================================================================
    // 1. DOM Element Selection
    //==========================================================================

    // Main form and controls
    const itemForm = document.getElementById('itemForm');
    const nameInput = document.getElementById('name');
    const emailInput = document.getElementById('email');
    const roleSelect = document.getElementById('role');
    const resetBtn = document.getElementById('resetBtn');

    // Toolbar and table elements
    const listBody = document.getElementById('list');
    const searchInput = document.getElementById('search');
    const perPageSelect = document.getElementById('perPage');
    const sortBySelect = document.getElementById('sortBy');

    // Footer and pagination controls
    const countSpan = document.getElementById('count');
    const pageSpan = document.getElementById('page');
    const prevBtn = document.getElementById('prev');
    const nextBtn = document.getElementById('next');

    // Bulk action and global controls
    const selectAllCheckbox = document.getElementById('selectAll');
    const bulkDeleteBtn = document.getElementById('bulkDelete');
    const exportCsvBtn = document.getElementById('exportCsv');
    const clearAllBtn = document.getElementById('alearAll'); // Note: HTML has a typo 'alearAll', this script matches it.

    // Modal elements for editing
    const modalBackdrop = document.getElementById('modalBackdrop');
    const editForm = document.getElementById('editForm');
    const editNameInput = document.getElementById('editName');
    const editEmailInput = document.getElementById('editEmail');
    const editRoleSelect = document.getElementById('editRole');
    const cancelEditBtn = document.getElementById('cancelEdit');


    //==========================================================================
    // 2. Application State
    //==========================================================================

    // Load users from LocalStorage or initialize with an empty array.
    let users = JSON.parse(localStorage.getItem('crud_users')) || [];

    // State variables for UI control
    let currentPage = 1;
    let perPage = parseInt(perPageSelect.value);
    let sortBy = sortBySelect.value;
    let searchQuery = '';
    let editingUserId = null;
    let selectedIds = new Set(); // Using a Set for efficient add/delete/has operations.


    //==========================================================================
    // 3. Core Functions
    //==========================================================================

    /**
     * Persists the current 'users' array to the browser's LocalStorage.
     */
    const saveToLocalStorage = () => {
        localStorage.setItem('crud_users', JSON.stringify(users));
    };

    /**
     * The main rendering engine for the application.
     * It filters, sorts, paginates the user data, and then updates the DOM.
     * This function is the single source of truth for the UI.
     */
    const render = () => {
        // --- Pipeline Step 1: Filter users based on search query ---
        let filteredUsers = users.filter(user =>
            user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            user.email.toLowerCase().includes(searchQuery.toLowerCase())
        );

        // --- Pipeline Step 2: Sort the filtered user list ---
        const [sortKey, sortOrder] = sortBy.split(':');
        filteredUsers.sort((a, b) => {
            let valA = a[sortKey];
            let valB = b[sortKey];

            if (typeof valA === 'string') {
                valA = valA.toLowerCase();
                valB = valB.toLowerCase();
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1;
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1;
            return 0;
        });

        // --- Pipeline Step 3: Paginate the sorted list ---
        const totalPages = Math.ceil(filteredUsers.length / perPage);
        const start = (currentPage - 1) * perPage;
        const end = start + perPage;
        const paginatedUsers = filteredUsers.slice(start, end);

        // --- Pipeline Step 4: Update the DOM with the final user list ---
        listBody.innerHTML = ''; // Clear the existing table body
        if (paginatedUsers.length === 0) {
            listBody.innerHTML = `<tr><td colspan="6" style="text-align:center;">No users found.</td></tr>`;
        } else {
            paginatedUsers.forEach(user => {
                const tr = document.createElement('tr');
                // BUG FIX: Added 'data-label' attributes to each <td> for mobile-friendly CSS.
                tr.innerHTML = `
                    <td data-label="Select"><input type="checkbox" class="row-checkbox" data-id="${user.id}" ${selectedIds.has(user.id) ? 'checked' : ''}></td>
                    <td data-label="Name">${user.name}</td>
                    <td data-label="Email">${user.email}</td>
                    <td data-label="Role"><span class="role ${user.role}">${user.role}</span></td>
                    <td data-label="Created">${new Date(user.createdAt).toLocaleString()}</td>
                    <td data-label="Actions">
                        <button class="btn small" data-action="edit" data-id="${user.id}">Edit</button>
                        <button class="btn small" data-action="copy" data-id="${user.id}">Copy</button>
                        <button class="btn small danger" data-action="delete" data-id="${user.id}">Delete</button>
                    </td>
                `;
                listBody.appendChild(tr);
            });
        }

        // --- Pipeline Step 5: Update footer, pagination, and controls ---
        countSpan.textContent = filteredUsers.length;
        pageSpan.textContent = currentPage;
        prevBtn.disabled = currentPage === 1;
        nextBtn.disabled = currentPage >= totalPages;
        selectAllCheckbox.checked = paginatedUsers.every(user => selectedIds.has(user.id)) && paginatedUsers.length > 0;
        
        // --- Final Step: Initialize custom dropdowns after every render ---
        setupCustomSelects();
    };
    
    /**
     * Hides the edit modal and resets its state.
     */
    const closeModal = () => {
        modalBackdrop.classList.remove('visible');
        editingUserId = null;
        editForm.reset();
    };


    //==========================================================================
    // 4. Event Listeners
    //==========================================================================

    // --- Form Submission ---
    itemForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const newUser = {
            id: Date.now(),
            name: nameInput.value.trim(),
            email: emailInput.value.trim(),
            role: roleSelect.value,
            createdAt: new Date().toISOString()
        };
        users.unshift(newUser); // Add new users to the top of the list
        saveToLocalStorage();
        render();
        itemForm.reset();
    });

    resetBtn.addEventListener('click', () => {
        itemForm.reset();
    });

    // --- Toolbar Controls ---
    searchInput.addEventListener('input', () => {
        searchQuery = searchInput.value;
        currentPage = 1; // Reset to first page on new search
        render();
    });

    perPageSelect.addEventListener('change', () => {
        perPage = parseInt(perPageSelect.value);
        currentPage = 1;
        render();
    });
    
    sortBySelect.addEventListener('change', () => {
        sortBy = sortBySelect.value;
        render();
    });

    // --- Pagination ---
    prevBtn.addEventListener('click', () => {
        if (currentPage > 1) {
            currentPage--;
            render();
        }
    });

    nextBtn.addEventListener('click', () => {
        const totalPages = Math.ceil(users.filter(u => u.name.toLowerCase().includes(searchQuery.toLowerCase())).length / perPage);
        if (currentPage < totalPages) {
            currentPage++;
            render();
        }
    });

    // --- Table Actions (using Event Delegation) ---
    listBody.addEventListener('click', (e) => {
        const target = e.target.closest('button'); // Ensure we get the button, even if an icon inside is clicked
        if (!target) return;

        const action = target.dataset.action;
        const id = parseInt(target.dataset.id);

        if (action === 'delete') {
            if (confirm('Are you sure you want to delete this user?')) {
                users = users.filter(user => user.id !== id);
                selectedIds.delete(id);
                saveToLocalStorage();
                render();
            }
        }
        
        if (action === 'edit') {
            editingUserId = id;
            const user = users.find(u => u.id === id);
            if (user) {
                editNameInput.value = user.name;
                editEmailInput.value = user.email;
                editRoleSelect.value = user.role;
                modalBackdrop.classList.add('visible');
                setupCustomSelects(); // Re-initialize dropdown inside the modal
            }
        }

        if (action === 'copy') {
            const user = users.find(u => u.id === id);
            if (user) {
                const copiedUser = { ...user, id: Date.now(), createdAt: new Date().toISOString() };
                users.unshift(copiedUser);
                saveToLocalStorage();
                render();
            }
        }
    });

    // --- Modal Form Submission and Closing ---
    editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const userIndex = users.findIndex(u => u.id === editingUserId);
        if (userIndex > -1) {
            users[userIndex].name = editNameInput.value.trim();
            users[userIndex].email = editEmailInput.value.trim();
            users[userIndex].role = editRoleSelect.value;
            saveToLocalStorage();
            render();
            closeModal();
        }
    });

    cancelEditBtn.addEventListener('click', closeModal);
    modalBackdrop.addEventListener('click', (e) => {
        if (e.target === modalBackdrop) { // Close only if clicking on the backdrop itself
            closeModal();
        }
    });

    // --- Bulk Actions ---
    selectAllCheckbox.addEventListener('change', () => {
        const checkboxesOnPage = listBody.querySelectorAll('.row-checkbox');
        checkboxesOnPage.forEach(checkbox => {
            const id = parseInt(checkbox.dataset.id);
            if (selectAllCheckbox.checked) {
                selectedIds.add(id);
                checkbox.checked = true;
            } else {
                selectedIds.delete(id);
                checkbox.checked = false;
            }
        });
    });

    listBody.addEventListener('change', (e) => {
        if (e.target.classList.contains('row-checkbox')) {
            const id = parseInt(e.target.dataset.id);
            if (e.target.checked) {
                selectedIds.add(id);
            } else {
                selectedIds.delete(id);
            }
            // Sync the 'Select All' checkbox state based on the page's checkboxes
            const checkboxesOnPage = listBody.querySelectorAll('.row-checkbox');
            selectAllCheckbox.checked = [...checkboxesOnPage].every(c => c.checked) && checkboxesOnPage.length > 0;
        }
    });

    bulkDeleteBtn.addEventListener('click', () => {
        if (selectedIds.size === 0) {
            alert('Please select users to delete.');
            return;
        }
        if (confirm(`Are you sure you want to delete ${selectedIds.size} selected user(s)?`)) {
            users = users.filter(user => !selectedIds.has(user.id));
            selectedIds.clear();
            saveToLocalStorage();
            currentPage = 1; // Reset to page 1 after deletion
            render();
        }
    });

    // --- Global Actions ---
    clearAllBtn.addEventListener('click', () => {
        if (confirm('DANGER: Are you sure you want to delete ALL users? This action cannot be undone.')) {
            users = [];
            selectedIds.clear();
            saveToLocalStorage();
            render();
        }
    });
    
    exportCsvBtn.addEventListener('click', () => {
        if (users.length === 0) {
            alert('No data to export.');
            return;
        }
        const headers = ['id', 'name', 'email', 'role', 'createdAt'];
        let csvContent = headers.join(",") + "\n";
        
        const csvRows = users.map(user => 
            headers.map(header => `"${String(user[header]).replace(/"/g, '""')}"`).join(",")
        );

        csvContent += csvRows.join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", "users.csv");
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });
    

    //==========================================================================
    // 5. Custom Select Dropdown Component
    //==========================================================================

    /**
     * Transforms all native <select> elements on the page into custom, styleable dropdowns.
     * This function should be called after any DOM update where new <select> elements are added.
     */
    function setupCustomSelects() {
        document.querySelectorAll('select').forEach(selectElement => {
            const container = selectElement.parentElement.classList.contains('custom-select-container') 
                ? selectElement.parentElement 
                : null;

            // If a custom select already exists, just update its trigger text.
            if (container) {
                container.querySelector('.custom-select-trigger').textContent = selectElement.options[selectElement.selectedIndex].textContent;
                return;
            }
            
            // --- Create the custom dropdown structure ---
            const customSelectContainer = document.createElement('div');
            customSelectContainer.classList.add('custom-select-container');
            selectElement.parentNode.insertBefore(customSelectContainer, selectElement);
            customSelectContainer.appendChild(selectElement);

            const customSelectTrigger = document.createElement('div');
            customSelectTrigger.classList.add('custom-select-trigger');
            customSelectTrigger.textContent = selectElement.options[selectElement.selectedIndex].textContent;
            customSelectContainer.appendChild(customSelectTrigger);
            
            const customOptions = document.createElement('div');
            customOptions.classList.add('custom-options');
            
            Array.from(selectElement.options).forEach(optionElement => {
                const customOption = document.createElement('div');
                customOption.classList.add('custom-option');
                customOption.textContent = optionElement.textContent;
                customOption.dataset.value = optionElement.value;
                if (optionElement.selected) customOption.classList.add('selected');
                
                customOption.addEventListener('click', () => {
                    // Update trigger text and original select value
                    customSelectTrigger.textContent = customOption.textContent;
                    selectElement.value = customOption.dataset.value;
                    
                    // Update 'selected' class on custom options
                    customOptions.querySelector('.selected')?.classList.remove('selected');
                    customOption.classList.add('selected');
                    
                    customOptions.classList.remove('open');
                    
                    // IMPORTANT: Trigger a 'change' event on the original select
                    // so that the main application logic can react to the change.
                    selectElement.dispatchEvent(new Event('change', { bubbles: true }));
                });
                customOptions.appendChild(customOption);
            });
            
            customSelectContainer.appendChild(customOptions);
            customSelectTrigger.addEventListener('click', () => {
                // Close other open dropdowns before opening a new one
                document.querySelectorAll('.custom-options.open').forEach(openDropdown => {
                    if (openDropdown !== customOptions) {
                        openDropdown.classList.remove('open');
                    }
                });
                customOptions.classList.toggle('open');
            });
        });
    }

    // Global listener to close dropdowns when clicking outside
    window.addEventListener('click', (e) => {
        if (!e.target.closest('.custom-select-container')) {
            document.querySelectorAll('.custom-options').forEach(options => {
                options.classList.remove('open');
            });
        }
    });

    //==========================================================================
    // 6. Initial Application Start
    //==========================================================================
    render();

});
