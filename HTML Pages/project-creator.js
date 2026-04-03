const form = document.getElementById('projectCreatorForm');
const previewContainer = document.getElementById('previewContainer');
const downloadSection = document.getElementById('downloadSection');
const downloadBtn = document.getElementById('downloadBtn');
const copyBtn = document.getElementById('copyBtn');
const newProjectBtn = document.getElementById('newProjectBtn');

let generatedHTML = '';
let uploadedImages = [];

// Admin check
if (sessionStorage.getItem('adminLoggedIn') !== 'true') {
    alert('You must be logged in as admin to create projects.');
    window.location.href = '../index.html';
}

// Form input event listeners for live preview
form.addEventListener('input', updatePreview);
form.addEventListener('change', (e) => {
    if (e.target.id === 'projectImages') {
        handleImageUpload(e);
    }
    updatePreview();
});
form.addEventListener('submit', handleFormSubmit);

// Handle image uploads
function handleImageUpload(e) {
    const files = Array.from(e.target.files).slice(0, 5); // Limit to 5 images
    uploadedImages = [];
    
    let loadedCount = 0;
    
    files.forEach((file, index) => {
        const reader = new FileReader();
        
        reader.onload = (event) => {
            uploadedImages[index] = event.target.result;
            loadedCount++;
            
            if (loadedCount === files.length) {
                console.log(`Uploaded ${uploadedImages.length} images`);
            }
        };
        
        reader.readAsDataURL(file);
    });
}

function updatePreview() {
    const projectName = document.getElementById('projectName').value;
    const projectYear = document.getElementById('projectYear').value;
    const projectType = document.getElementById('projectType').value;
    const projectLanguage = document.getElementById('projectLanguage').value;
    const projectDescription = document.getElementById('projectDescription').value;
    const projectFeatures = document.getElementById('projectFeatures').value;

    if (projectName && projectDescription) {
        const featuresArray = projectFeatures
            ? projectFeatures.split(',').map(f => f.trim()).filter(f => f)
            : [];

        const previewHTML = `
            <div class="project-preview">
                <div class="preview-title">${escapeHtml(projectName)}</div>
                <div class="preview-meta">
                    ${projectYear ? `<span class="preview-badge">${escapeHtml(projectYear)}</span>` : ''}
                    ${projectType ? `<span class="preview-badge">${escapeHtml(projectType)}</span>` : ''}
                    ${projectLanguage ? `<span class="preview-badge">${escapeHtml(projectLanguage)}</span>` : ''}
                </div>
                <div class="preview-description">${escapeHtml(projectDescription)}</div>
                ${featuresArray.length > 0 ? `
                    <div class="preview-features">
                        <h4>Key Features</h4>
                        <ul>
                            ${featuresArray.map(f => `<li>${escapeHtml(f)}</li>`).join('')}
                        </ul>
                    </div>
                ` : ''}
            </div>
        `;
        previewContainer.innerHTML = previewHTML;
    } else {
        previewContainer.innerHTML = `
            <div class="preview-placeholder">
                <p>Fill out the form to see a preview of your project page 👉</p>
            </div>
        `;
    }
}

function handleFormSubmit(e) {
    e.preventDefault();

    // Get all form values
    const formData = {
        projectName: document.getElementById('projectName').value,
        projectYear: document.getElementById('projectYear').value,
        projectType: document.getElementById('projectType').value,
        projectLanguage: document.getElementById('projectLanguage').value,
        projectDescription: document.getElementById('projectDescription').value,
        projectFeatures: document.getElementById('projectFeatures').value,
        projectImage: document.getElementById('projectImage').value,
        projectLink: document.getElementById('projectLink').value,
        projectStatus: document.getElementById('projectStatus').value,
        projectChallenges: document.getElementById('projectChallenges').value,
        projectLearnings: document.getElementById('projectLearnings').value,
        projectFilename: document.getElementById('projectFilename').value
    };

    // Generate HTML file
    generatedHTML = generateProjectHTML(formData);

    // Save project to localStorage
    saveProjectToLocalStorage(formData);

    // Update UI with success message
    updateDownloadSectionUI(formData);

    // Show download section
    downloadSection.style.display = 'block';
    downloadSection.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Setup event listeners for download buttons
    downloadBtn.onclick = () => downloadFile(formData.projectName, formData.projectFilename);
    copyBtn.onclick = () => copyToClipboard();

    // Hide preview placeholder when showing download section
    form.style.display = 'none';
}

function saveProjectToLocalStorage(formData) {
    // Get existing custom projects or initialize empty array
    const existingProjects = JSON.parse(localStorage.getItem('customProjects') || '[]');
    
    // Extract just the main content from generated HTML (between <main> tags)
    const mainMatch = generatedHTML.match(/<main[^>]*>([\s\S]*?)<\/main>/);
    const projectContent = mainMatch ? mainMatch[1] : generatedHTML;
    
    // Create project object for the table
    const newProject = {
        name: formData.projectName,
        year: formData.projectYear || 'N/A',
        type: formData.projectType || 'N/A',
        language: formData.projectLanguage || 'N/A',
        description: formData.projectDescription,
        status: formData.projectStatus || 'Completed',
        link: `view-custom-project.html?id=${existingProjects.length}`,
        html: projectContent,
        images: uploadedImages.filter(img => img !== undefined), // Include uploaded images
        challenges: formData.projectChallenges || '',
        learnings: formData.projectLearnings || ''
    };
    
    // Add the new project
    existingProjects.push(newProject);
    
    // Save back to localStorage
    localStorage.setItem('customProjects', JSON.stringify(existingProjects));
    
    // Dispatch custom event so other pages can listen for project updates
    window.dispatchEvent(new CustomEvent('projectAdded', { detail: newProject }));
}

function updateDownloadSectionUI(formData, extraMessage = '') {
    const statusText = extraMessage ? `<p>${escapeHtml(extraMessage)}</p>` : '';
    const successMessage = document.createElement('div');
    successMessage.className = 'success-message';
    successMessage.innerHTML = `
        <div class="success-content">
            <h3>✨ Project Created Successfully!</h3>
            <p><strong>${escapeHtml(formData.projectName)}</strong> has been added to your projects table.</p>
            ${statusText}
            <div class="action-buttons">
                <a href="ProjectsTable.html" class="btn btn-primary">View All Projects</a>
                <button class="btn btn-secondary" onclick="document.querySelector('.success-message').remove()">Continue</button>
            </div>
        </div>
    `;
    
    downloadSection.insertAdjacentElement('afterend', successMessage);
}

function generateProjectHTML(data) {
    const featuresArray = data.projectFeatures
        ? data.projectFeatures.split(',').map(f => f.trim()).filter(f => f)
        : [];

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${escapeHtml(data.projectName)} - Jack Maguire Portfolio</title>
    <link rel="stylesheet" href="../css/project-page.css">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;600;700&display=swap" rel="stylesheet">
    <link rel="icon" type="image/png" href="../images/PicForBar.png">
</head>
<body>
    <!-- Navigation Bar -->
    <nav class="navbar">
        <div class="nav-container">
            <a href="../index.html" class="nav-logo">
                <span class="logo-symbol">🤖</span>
                <span>Jack Maguire</span>
            </a>
            <div class="nav-menu">
                <a href="../index.html#home" class="nav-link">Home</a>
                <a href="../index.html#about" class="nav-link">About</a>
                <a href="../index.html#projects" class="nav-link">Projects</a>
                <a href="../index.html" class="nav-link">Home</a>
            </div>
            <div class="hamburger">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    </nav>

    <!-- Project Header -->
    <section class="project-header">
        <div class="container">
            <div class="header-content">
                <div class="breadcrumb">
                    <a href="../index.html">Home</a>
                    <span>/</span>
                    <a href="ProjectsTable.html">Projects</a>
                    <span>/</span>
                    <span>${escapeHtml(data.projectName)}</span>
                </div>
                ${data.projectImage ? `<img src="${escapeHtml(data.projectImage)}" alt="${escapeHtml(data.projectName)}" class="header-image">` : ''}
            </div>
        </div>
    </section>

    <!-- Project Content -->
    <section class="project-content">
        <div class="container">
            <div class="content-grid">
                <div class="main-content">
                    <h1>${escapeHtml(data.projectName)}</h1>
                    
                    <div class="project-meta">
                        <div class="meta-item">
                            <span class="label">Year:</span>
                            <span>${escapeHtml(data.projectYear)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="label">Type:</span>
                            <span class="badge">${escapeHtml(data.projectType)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="label">Technology:</span>
                            <span>${escapeHtml(data.projectLanguage)}</span>
                        </div>
                        <div class="meta-item">
                            <span class="label">Status:</span>
                            <span class="status ${data.projectStatus.toLowerCase()}">${escapeHtml(data.projectStatus)}</span>
                        </div>
                    </div>

                    <section class="description-section">
                        <h2>About This Project</h2>
                        <p>${escapeHtml(data.projectDescription).replace(/\n/g, '</p><p>')}</p>
                    </section>

                    ${featuresArray.length > 0 ? `
                    <section class="features-section">
                        <h2>Key Features</h2>
                        <ul class="features-list">
                            ${featuresArray.map(feature => `<li>${escapeHtml(feature)}</li>`).join('')}
                        </ul>
                    </section>
                    ` : ''}

                    ${data.projectChallenges ? `
                    <section class="challenges-section">
                        <h2>Challenges & Solutions</h2>
                        <p>${escapeHtml(data.projectChallenges).replace(/\n/g, '</p><p>')}</p>
                    </section>
                    ` : ''}

                    ${data.projectLearnings ? `
                    <section class="learnings-section">
                        <h2>What I Learned</h2>
                        <p>${escapeHtml(data.projectLearnings).replace(/\n/g, '</p><p>')}</p>
                    </section>
                    ` : ''}
                </div>

                <aside class="sidebar">
                    <div class="sidebar-card">
                        <h3>Project Links</h3>
                        ${data.projectLink ? `<a href="${escapeHtml(data.projectLink)}" target="_blank" class="sidebar-link">View Project →</a>` : ''}
                        <a href="ProjectsTable.html" class="sidebar-link">Back to All Projects</a>
                    </div>

                    <div class="sidebar-card">
                        <h3>Project Details</h3>
                        <div class="details-list">
                            <div class="detail-item">
                                <span class="detail-label">Type:</span>
                                <span>${escapeHtml(data.projectType)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Year:</span>
                                <span>${escapeHtml(data.projectYear)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Tech Stack:</span>
                                <span>${escapeHtml(data.projectLanguage)}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Status:</span>
                                <span class="status ${data.projectStatus.toLowerCase()}">${escapeHtml(data.projectStatus)}</span>
                            </div>
                        </div>
                    </div>
                </aside>
            </div>
        </div>
    </section>

    <!-- Navigation to other projects -->
    <section class="related-projects">
        <div class="container">
            <h2>Other Projects</h2>
            <a href="ProjectsTable.html" class="btn btn-primary">View All Projects →</a>
        </div>
    </section>

    <!-- Footer -->
    <footer class="footer">
        <div class="container">
            <p>&copy; 2024 Jack Maguire. Showcasing my passion for coding and creation.</p>
            <div class="social-links">
                <a href="https://github.com/JMagDev1" target="_blank">GitHub</a>
                <a href="../index.html">Home</a>
            </div>
        </div>
    </footer>

    <script src="project-page.js"></script>
</body>
</html>`;

    return html;
}

function downloadFile(projectName, projectFilename) {
    const element = document.createElement('a');
    const fileName = projectFilename ? projectFilename + '.html' : projectName.toLowerCase().replace(/\s+/g, '-') + '.html';
    element.setAttribute('href', 'data:text/html;charset=utf-8,' + encodeURIComponent(generatedHTML));
    element.setAttribute('download', fileName);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);

    // Show success feedback
    const originalText = downloadBtn.textContent;
    downloadBtn.textContent = '✓ Downloaded!';
    setTimeout(() => {
        downloadBtn.textContent = originalText;
    }, 3000);
}

function copyToClipboard() {
    navigator.clipboard.writeText(generatedHTML).then(() => {
        const originalText = copyBtn.textContent;
        copyBtn.textContent = '✓ Copied!';
        setTimeout(() => {
            copyBtn.textContent = originalText;
        }, 3000);

        // Show code preview
        document.getElementById('codePreview').style.display = 'block';
        const codeContent = document.getElementById('codeContent');
        codeContent.textContent = generatedHTML;

        // Setup close button
        document.querySelector('.close-preview').onclick = () => {
            document.getElementById('codePreview').style.display = 'none';
        };
    });
}

function createNewProject() {
    form.reset();
    downloadSection.style.display = 'none';
    form.style.display = 'flex';
    document.getElementById('codePreview').style.display = 'none';
    previewContainer.innerHTML = `
        <div class="preview-placeholder">
            <p>Fill out the form to see a preview of your project page 👉</p>
        </div>
    `;
    form.scrollIntoView({ behavior: 'smooth' });
}

newProjectBtn.addEventListener('click', createNewProject);

// Hamburger Menu Toggle
const hamburger = document.querySelector('.hamburger');
const navMenu = document.querySelector('.nav-menu');

if (hamburger) {
    hamburger.addEventListener('click', () => {
        navMenu.classList.toggle('active');
        hamburger.classList.toggle('active');
        document.body.classList.toggle('nav-open', navMenu.classList.contains('active'));
    });
}

// Helper function to escape HTML
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize preview on page load
updatePreview();
