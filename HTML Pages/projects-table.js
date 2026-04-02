let filteredProjects = [...projectsData];

const typeFilter = document.getElementById('typeFilter');
const searchInput = document.getElementById('searchInput');
const sortSelect = document.getElementById('sortSelect');
const projectsTableBody = document.getElementById('projectsTableBody');
const projectCount = document.getElementById('projectCount');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderProjects();
    setupEventListeners();
});

function setupEventListeners() {
    typeFilter.addEventListener('change', filterAndRender);
    searchInput.addEventListener('input', filterAndRender);
    sortSelect.addEventListener('change', filterAndRender);
}

function filterAndRender() {
    filteredProjects = projectsData.filter(project => {
        const matchesType = !typeFilter.value || project.type === typeFilter.value;
        const matchesSearch = !searchInput.value || 
            project.name.toLowerCase().includes(searchInput.value.toLowerCase()) ||
            project.language.toLowerCase().includes(searchInput.value.toLowerCase());
        
        return matchesType && matchesSearch;
    });

    // Sort projects
    const sortValue = sortSelect.value;
    if (sortValue === 'newest') {
        filteredProjects.sort((a, b) => getYearValue(b.year) - getYearValue(a.year));
    } else if (sortValue === 'oldest') {
        filteredProjects.sort((a, b) => getYearValue(a.year) - getYearValue(b.year));
    } else if (sortValue === 'name') {
        filteredProjects.sort((a, b) => a.name.localeCompare(b.name));
    }

    renderProjects();
}

function renderProjects() {
    projectsTableBody.innerHTML = '';

    filteredProjects.forEach(project => {
        const row = document.createElement('tr');
        const isExternal = project.link.startsWith('http');
        const linkHtml = isExternal 
            ? `<a href="${project.link}" target="_blank" class="project-link">View Project →</a>`
            : `<a href="${project.link}" class="project-link">View Project →</a>`;

        row.innerHTML = `
            <td class="project-name">${project.name}</td>
            <td class="project-year">${project.year}</td>
            <td>
                <span class="type-badge ${project.type.toLowerCase()}">
                    ${project.type}
                </span>
            </td>
            <td class="project-language">${project.language}</td>
            <td class="project-details">${linkHtml}</td>
        `;

        projectsTableBody.appendChild(row);
    });

    // Update project count
    projectCount.textContent = filteredProjects.length;

    // Add animation
    const rows = projectsTableBody.querySelectorAll('tr');
    rows.forEach((row, index) => {
        row.style.animation = `fadeInUp 0.5s ease-out ${index * 0.05}s both`;
    });
}

// Hamburger Menu Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
    });
}

// Close menu when clicking on a link
const navLinks = document.querySelectorAll('.nav-link');
navLinks.forEach(link => {
    link.addEventListener('click', () => {
        if (navMenu) navMenu.classList.remove('active');
        if (hamburger) hamburger.classList.remove('active');
    });
});

// Navbar shadow on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.boxShadow = '0 10px 30px rgba(99, 102, 241, 0.1)';
    } else {
        navbar.style.boxShadow = 'none';
    }
});
