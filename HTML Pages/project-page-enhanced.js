// ========================================
// PROJECT PAGE ENHANCEMENTS
// Image Carousel & Project Editing
// ========================================

// Carousel Management
class ProjectCarousel {
    constructor() {
        this.currentSlide = 0;
        this.slides = [];
        this.init();
    }

    init() {
        this.slides = document.querySelectorAll('.carousel-slide');
        this.setupControls();
        if (this.slides.length > 0) {
            this.showSlide(0);
        }
    }

    setupControls() {
        const prevBtn = document.querySelector('.carousel-button.prev');
        const nextBtn = document.querySelector('.carousel-button.next');
        const dots = document.querySelectorAll('.carousel-dot');

        if (prevBtn) prevBtn.addEventListener('click', (e) => { e.preventDefault(); this.previousSlide(); });
        if (nextBtn) nextBtn.addEventListener('click', (e) => { e.preventDefault(); this.nextSlide(); });
        
        dots.forEach((dot, index) => {
            dot.addEventListener('click', (e) => { e.preventDefault(); this.showSlide(index); });
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (document.querySelector('.modal.active')) return; // Don't navigate if modal is open
            if (e.key === 'ArrowLeft') this.previousSlide();
            if (e.key === 'ArrowRight') this.nextSlide();
        });
    }

    showSlide(n) {
        if (this.slides.length === 0) return;
        
        this.currentSlide = (n + this.slides.length) % this.slides.length;
        
        this.slides.forEach(slide => slide.classList.remove('active'));
        this.slides[this.currentSlide].classList.add('active');
        
        const dots = document.querySelectorAll('.carousel-dot');
        dots.forEach(dot => dot.classList.remove('active'));
        dots[this.currentSlide]?.classList.add('active');

        this.updateCarouselInfo();
    }

    nextSlide() {
        this.showSlide(this.currentSlide + 1);
    }

    previousSlide() {
        this.showSlide(this.currentSlide - 1);
    }

    updateCarouselInfo() {
        const info = document.querySelector('.carousel-info');
        if (info) {
            info.textContent = `Image ${this.currentSlide + 1} of ${this.slides.length}`;
        }
    }
}

// Project Editor
class ProjectEditor {
    constructor() {
        this.modal = null;
        this.currentProjectData = null;
        this.init();
    }

    init() {
        const editBtn = document.querySelector('.btn-edit');
        const deleteBtn = document.querySelector('.btn-delete');

        if (editBtn) editBtn.addEventListener('click', () => this.openEditModal());
        if (deleteBtn) {
            // Check if user is admin
            const isAdmin = sessionStorage.getItem('adminLoggedIn') === 'true';
            if (isAdmin) {
                deleteBtn.addEventListener('click', () => this.openDeleteConfirm());
            } else {
                // Hide delete button and add login prompt on click
                deleteBtn.style.display = 'none';
            }
        }

        this.setupModal();
    }

    setupModal() {
        const modal = document.querySelector('.modal');
        if (modal) {
            const closeBtn = modal.querySelector('.modal-close');
            if (closeBtn) closeBtn.addEventListener('click', () => this.closeModal());
            
            modal.addEventListener('click', (e) => {
                if (e.target === modal) this.closeModal();
            });
        }
    }

    openEditModal() {
        // Extract current project data from page
        const projectName = document.querySelector('.main-content h1')?.textContent || 'Project';
        const description = document.querySelector('.description-section p')?.textContent || '';
        
        const form = document.querySelector('.edit-form');
        if (form) {
            form.querySelector('input[name="projectName"]').value = projectName;
            form.querySelector('textarea[name="projectDescription"]').value = description;
        }

        this.modal = document.querySelector('.modal');
        if (this.modal) {
            this.modal.classList.add('active');
        }
    }

    closeModal() {
        if (this.modal) {
            this.modal.classList.remove('active');
        }
    }

    saveProject(data) {
        // Get custom projects from localStorage
        const customProjects = JSON.parse(localStorage.getItem('customProjects') || '[]');
        const projectIndex = customProjects.findIndex(p => p.name === data.projectName);

        if (projectIndex !== -1) {
            // Update existing project
            customProjects[projectIndex] = { ...customProjects[projectIndex], ...data };
            localStorage.setItem('customProjects', JSON.stringify(customProjects));
            
            // Refresh the page to show updates
            setTimeout(() => window.location.reload(), 500);
        }

        this.closeModal();
    }

    openDeleteConfirm() {
        const projectName = document.querySelector('.main-content h1')?.textContent || 'Project';
        const confirmDelete = confirm(`Are you sure you want to delete "${projectName}"?\n\nThis action cannot be undone.`);

        if (confirmDelete) {
            this.deleteProject(projectName);
        }
    }

    deleteProject(projectName) {
        try {
            const customProjects = JSON.parse(localStorage.getItem('customProjects') || '[]');
            const filteredProjects = customProjects.filter(p => p.name !== projectName);
            localStorage.setItem('customProjects', JSON.stringify(filteredProjects));

            // Redirect to projects table
            alert('Project deleted successfully!');
            window.location.href = 'ProjectsTable.html';
        } catch (error) {
            console.error('Error deleting project:', error);
            alert('Failed to delete project');
        }
    }
}

// Populate carousel with project images
function populateCarousel() {
    const carousel = document.querySelector('.image-carousel');
    if (!carousel) return;

    const projectName = document.querySelector('.main-content h1')?.textContent || '';
    const imageDirs = {
        'Calculator': 'Calc',
        'Finance Web App': 'Finance Web App',
        'Google Home Page 3': 'GHP3',
        'Golf Score Card': 'Golf Score Card',
        '2nd Google Home Page': '2nd Google Home Page',
        'Nature Explorer': 'Nature Explorer',
        'Pirelli F1 Tyre': 'Pirelli F1 Tyre',
        'HyperDrive Havoc': 'HyperDrive Havoc',
        'Interests Form - Linked to JARVIS': 'Interests Form Jarvis',
        'Iron Man Helmet': 'Iron Man Helmet',
        'Marvel Movies Project': 'Marvel Movies',
        'Ski Trip Organiser - GCSE Digital Technology': 'Ski Trip Organiser DT GCSE',
        'GCSE Technology and Design Coursework Project': 'Tech & Design GCSE Project',
        'Weather Web App': 'Weather Web App',
        'Autoclicker': 'Autoclicker'
    };

    const container = carousel.querySelector('.carousel-container');
    const controlsContainer = carousel.querySelector('.carousel-controls');

    // Check if this is a custom project with uploaded images
    const isCustomProject = document.querySelector('[data-custom-project]');
    if (isCustomProject) {
        const projectId = isCustomProject.dataset.customProject;
        const projects = JSON.parse(localStorage.getItem('customProjects') || '[]');
        const project = projects[projectId];

        if (project && project.images && project.images.length > 0) {
            // Load uploaded images
            project.images.forEach((imgData, i) => {
                const slide = document.createElement('div');
                slide.className = 'carousel-slide';
                if (i === 0) slide.classList.add('active');
                
                const img = document.createElement('img');
                img.src = imgData; // Base64 data URL
                img.alt = `Project image ${i + 1}`;
                
                slide.appendChild(img);
                container.appendChild(slide);

                // Create dot
                const dot = document.createElement('button');
                dot.className = 'carousel-dot';
                if (i === 0) dot.classList.add('active');
                dot.setAttribute('data-slide', i);
                controlsContainer.appendChild(dot);
            });

            const info = carousel.querySelector('.carousel-info');
            if (info && project.images.length > 0) {
                info.textContent = `${project.images.length} image${project.images.length !== 1 ? 's' : ''}`;
            }

            // Add carousel controls
            addCarouselControls(container, controlsContainer);
            return;
        }
    }

    // For static projects, check which images actually exist
    const imageDir = imageDirs[projectName];
    if (!imageDir) {
        // No images available - show placeholder
        const slide = document.createElement('div');
        slide.className = 'carousel-slide active';
        slide.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:var(--muted-text);font-size:1.2rem;">📸 No images available yet</div>';
        container.appendChild(slide);
        carousel.style.display = 'block';
        return;
    }

    // For static projects, dynamically check for images and only add existing ones
    const imagePath = `../images/${imageDir}/`;
    let validImages = 0;
    const maxImages = 10; // Check up to 10 images

    // Create image load promises to check existence
    const imagePromises = [];
    for (let i = 1; i <= maxImages; i++) {
        imagePromises.push(
            new Promise((resolve) => {
                const img = new Image();
                img.onload = () => resolve({i, exists: true});
                img.onerror = () => resolve({i, exists: false});
                img.src = `${imagePath}image${i}.png`;
            })
        );
    }

    Promise.all(imagePromises).then((results) => {
        const existingImages = results.filter(r => r.exists);

        if (existingImages.length === 0) {
            // No images found - show placeholder
            const slide = document.createElement('div');
            slide.className = 'carousel-slide active';
            slide.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:var(--muted-text);font-size:1.2rem;">📸 No images available yet</div>';
            container.appendChild(slide);
            carousel.style.display = 'block';
            return;
        }

        // Add only existing images
        existingImages.forEach((result, index) => {
            const slide = document.createElement('div');
            slide.className = 'carousel-slide';
            if (index === 0) slide.classList.add('active');
            
            const img = document.createElement('img');
            img.src = `${imagePath}image${result.i}.png`;
            img.alt = `Project image ${index + 1}`;
            
            slide.appendChild(img);
            container.appendChild(slide);

            // Create dot
            const dot = document.createElement('button');
            dot.className = 'carousel-dot';
            if (index === 0) dot.classList.add('active');
            dot.setAttribute('data-slide', index);
            controlsContainer.appendChild(dot);
        });

        const info = carousel.querySelector('.carousel-info');
        if (info) {
            info.textContent = `${existingImages.length} image${existingImages.length !== 1 ? 's' : ''}`;
        }

        addCarouselControls(container, controlsContainer);
        carousel.style.display = 'block';
    });
}

function addCarouselControls(container, controlsContainer) {
    // Add prev/next buttons if they don't exist
    if (!container.parentElement.querySelector('.carousel-button.prev')) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'carousel-button prev';
        prevBtn.innerHTML = '❮';
        container.parentElement.appendChild(prevBtn);

        const nextBtn = document.createElement('button');
        nextBtn.className = 'carousel-button next';
        nextBtn.innerHTML = '❯';
        container.parentElement.appendChild(nextBtn);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    populateCarousel();
    window.carousel = new ProjectCarousel();
    window.editor = new ProjectEditor();

    // Handle edit form submission
    const editForm = document.querySelector('.edit-form');
    if (editForm) {
        editForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const formData = new FormData(editForm);
            const data = Object.fromEntries(formData);
            window.editor.saveProject(data);
        });
    }

    // Handle custom project editing (for localStorage projects)
    const isCustomProject = document.querySelector('[data-custom-project]');
    if (isCustomProject) {
        const editBtn = document.querySelector('.btn-edit');
        const deleteBtn = document.querySelector('.btn-delete');

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                alert('Project editing coming soon! You can currently delete and recreate projects.');
            });
        }

        if (deleteBtn) {
            deleteBtn.addEventListener('click', () => {
                const projectId = isCustomProject.dataset.customProject;
                const projectName = document.querySelector('.main-content h1')?.textContent;
                
                const confirmDelete = confirm(`Are you sure you want to delete "${projectName}"?`);
                if (confirmDelete) {
                    const projects = JSON.parse(localStorage.getItem('customProjects') || '[]');
                    projects.splice(projectId, 1);
                    localStorage.setItem('customProjects', JSON.stringify(projects));
                    window.location.href = 'ProjectsTable.html';
                }
            });
        }
    }
});

// Update carousel info on load
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        const carousel = document.querySelector('.image-carousel');
        if (carousel) {
            const info = carousel.querySelector('.carousel-info');
            const slides = carousel.querySelectorAll('.carousel-slide');
            if (info && slides.length > 0) {
                info.textContent = `Image 1 of ${slides.length}`;
            }
        }
    });
} else {
    const carousel = document.querySelector('.image-carousel');
    if (carousel) {
        const info = carousel.querySelector('.carousel-info');
        const slides = carousel.querySelectorAll('.carousel-slide');
        if (info && slides.length > 0) {
            info.textContent = `Image 1 of ${slides.length}`;
        }
    }
}
