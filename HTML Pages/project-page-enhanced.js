// ========================================
// PROJECT PAGE ENHANCEMENTS
// Image Carousel & Project Editing
// ========================================

// Carousel Management
class ProjectCarousel {
    constructor(carouselElement = null) {
        this.carousel = carouselElement || document.querySelector('.image-carousel');
        this.currentSlide = 0;
        this.slides = [];
        this.dots = [];
        this.prevBtn = null;
        this.nextBtn = null;
        this.init();
    }

    init() {
        if (!this.carousel) return;

        this.slides = this.carousel.querySelectorAll('.carousel-slide');
        this.dots = this.carousel.querySelectorAll('.carousel-dot');
        this.prevBtn = this.carousel.querySelector('.carousel-button.prev');
        this.nextBtn = this.carousel.querySelector('.carousel-button.next');

        this.setupControls();
        if (this.slides.length > 0) {
            this.showSlide(0);
        }
    }

    setupControls() {
        // Set up button event listeners
        if (this.prevBtn) {
            this.prevBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.previousSlide();
            });
        }

        if (this.nextBtn) {
            this.nextBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.nextSlide();
            });
        }

        // Set up dot event listeners
        this.dots.forEach((dot, index) => {
            dot.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                this.showSlide(index);
            });
        });

        // Keyboard navigation
        document.addEventListener('keydown', (e) => {
            if (document.querySelector('.modal.active')) return; // Don't navigate if modal is open
            if (e.key === 'ArrowLeft') {
                e.preventDefault();
                this.previousSlide();
            }
            if (e.key === 'ArrowRight') {
                e.preventDefault();
                this.nextSlide();
            }
        });
    }

    showSlide(n) {
        if (this.slides.length === 0) return;

        this.currentSlide = (n + this.slides.length) % this.slides.length;

        this.slides.forEach(slide => slide.classList.remove('active'));
        this.slides[this.currentSlide].classList.add('active');

        // Update dots within this carousel
        this.dots.forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentSlide);
        });

        this.updateCarouselInfo();
    }

    nextSlide() {
        this.showSlide(this.currentSlide + 1);
    }

    previousSlide() {
        this.showSlide(this.currentSlide - 1);
    }

    updateCarouselInfo() {
        const info = this.carousel.querySelector('.carousel-info');
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
    
    // First, try to get the actual list of images from the directory
    // Since we can't directly list directory contents from client-side JS,
    // we'll check for common naming patterns and actual filenames we know exist
    
    // Define known image mappings for each project
    const knownImages = {
        'Autoclicker': ['autoclicker-image.png'],
        'Finance Web App': ['Whole Page.png', 'Pic 2 - Added Expense.png', 'Pic 3 - Added savings target and amount.png', 'Pic 4 - amount out of savings.png', 'Pic 5 - Add bills.png', 'Pic 6 - Added bills.png'],
        'GHP3': ['Image1.png', 'Image2Preset1.png', 'Image3Settings.png', 'Image4SettingsP1.png'],
        'Golf Score Card': ['Pic1.jpg', 'Pic2.jpg', 'Pic3.jpg', 'Pic4.jpg'],
        '2nd Google Home Page': ['Pic1.png', 'Pic2.png', 'Pic3.png', 'Pic4.png'],
        'Nature Explorer': ['Pic1.png', 'Pic2.png', 'Pic3.png'],
        'HyperDrive Havoc': ['Image1.png', 'Image2.png', 'Image3.png', 'AllCars.png', 'Car1.png', 'Car2.png', 'Car3.png', 'Car4.png', 'UIImageOnLoad.png'],
        'Interests Form - Linked to JARVIS': ['Jarvis.png'],
        'Iron Man Helmet': ['Pic1.jpg', 'Pic2.jpg', 'Pic3.jpg'],
        'Marvel Movies Project': ['Menu.png', 'Phase-three-example.png', 'Phases.png', 'Timeline-example.png', 'Timeline.png'],
        'Ski Trip Organiser - GCSE Digital Technology': ['FrmAddPupil.png', 'FrmAddTimes.png', 'FrmQuiz.png', 'FrmReports-GroupLvls.png', 'FrmReports-QuizScore.png', 'FrmReports-StudentList.png', 'login-both.png', 'Login-pg.png', 'Menu.png'],
        'GCSE Technology and Design Coursework Project': ['Top view.jpg'],
        'Weather Web App': ['Image1.png'],
        'Calculator': ['image1.png'],
        'Pirelli F1 Tyre': ['image1.png']
    };

    // Get the list of images for this project
    const projectImages = knownImages[projectName] || [];
    
    if (projectImages.length === 0) {
        // No images defined for this project - show placeholder
        const slide = document.createElement('div');
        slide.className = 'carousel-slide active';
        slide.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:var(--muted-text);font-size:1.2rem;">📸 No images available yet</div>';
        container.appendChild(slide);
        carousel.style.display = 'block';
        return;
    }

    // Check which images actually exist
    const imagePromises = projectImages.map((imageName, index) => 
        new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve({name: imageName, index, exists: true});
            img.onerror = () => resolve({name: imageName, index, exists: false});
            img.src = `${imagePath}${imageName}`;
        })
    );

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
            img.src = `${imagePath}${result.name}`;
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

        // Update carousel info
        const info = carousel.querySelector('.carousel-info');
        if (info) {
            info.textContent = `${existingImages.length} image${existingImages.length !== 1 ? 's' : ''}`;
        }

        // Add carousel controls
        addCarouselControls(container, controlsContainer);

        // Initialize carousel after controls are added
        setTimeout(() => {
            if (window.carousel) {
                window.carousel.init();
            } else {
                window.carousel = new ProjectCarousel(carousel);
            }
        }, 100);
    }).catch((error) => {
        console.error('Error loading carousel images:', error);
        // Show placeholder on error
        const slide = document.createElement('div');
        slide.className = 'carousel-slide active';
        slide.innerHTML = '<div style="display:flex;align-items:center;justify-content:center;width:100%;height:100%;color:var(--muted-text);font-size:1.2rem;">📸 Error loading images</div>';
        container.appendChild(slide);
        carousel.style.display = 'block';
    });
}

function addCarouselControls(container, controlsContainer) {
    // Add prev/next buttons if they don't exist
    const carousel = container.parentElement; // .image-carousel

    if (!carousel.querySelector('.carousel-button.prev')) {
        const prevBtn = document.createElement('button');
        prevBtn.className = 'carousel-button prev';
        prevBtn.innerHTML = '❮';
        prevBtn.title = 'Previous image';
        carousel.appendChild(prevBtn);

        const nextBtn = document.createElement('button');
        nextBtn.className = 'carousel-button next';
        nextBtn.innerHTML = '❯';
        nextBtn.title = 'Next image';
        carousel.appendChild(nextBtn);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    populateCarousel();
    // Don't initialize carousel here - it will be initialized after images load
    // window.carousel = new ProjectCarousel();
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
