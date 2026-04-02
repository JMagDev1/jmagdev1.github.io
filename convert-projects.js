const fs = require('fs');
const path = require('path');

// Define project information and descriptions
const projectInfo = {
  'Calc.html': {
    name: 'Calculator',
    year: 'June 2023',
    type: 'Coding',
    language: 'HTML, CSS & JS',
    status: 'Completed',
    description: 'A fully functional calculator built with vanilla JavaScript. This was my first project working with JavaScript logic and DOM manipulation. The calculator supports basic arithmetic operations and demonstrates event handling and state management.',
    features: ['Basic arithmetic operations', 'Clear button', 'Real-time display', 'Responsive design'],
    learnings: 'Building this project taught me how to structure JavaScript code for user interactions, handle edge cases in calculations, and create a clean user interface. I learned the importance of proper input validation and error handling.',
    challenges: 'The main challenge was managing the calculator state and ensuring operations behaved correctly. I also learned the best practices for organizing JavaScript code with clear function separation.'
  },
  'FinanceWA.html': {
    name: 'Finance Web App',
    year: 'June - August 2023',
    type: 'Coding',
    language: 'HTML, CSS & JS',
    status: 'Completed',
    description: 'A comprehensive personal finance tracker with multiple features for managing money. The app includes expense tracking, savings goals, bill management, and income/expense categorization. Built entirely with HTML, CSS, and JavaScript.',
    features: [
      'Expense and income tracking with categories',
      'Savings goal tracker with progress indicators',
      'Monthly bill organizer',
      'Transactional tables with sorting',
      'Real-time calculations',
      'Responsive data tables'
    ],
    learnings: 'This project deepened my understanding of DOM manipulation, data organization, and creating intuitive user interfaces. I learned how to structure complex applications with multiple interconnected features and manage user input effectively.',
    challenges: 'The main challenge was managing data persistence without a backend database. At the time, I wanted to add backend functionality to save data permanently, but lacked the knowledge. This motivated me to learn backend technologies later. I also had to optimize table rendering for multiple simultaneous datasets.'
  },
  'GHP3.html': {
    name: 'Google Home Page 3',
    year: 'February 2024',
    type: 'Coding',
    language: 'HTML, CSS, JS',
    status: 'Completed',
    description: 'The third iteration of my Google homepage remake. This version shows my evolution in web design and development skills, incorporating modern CSS techniques and improved JavaScript functionality.',
    features: ['Search functionality', 'Modern CSS styling', 'Responsive layout', 'Clean interface'],
    learnings: 'Each iteration of this project demonstrated my growing understanding of web design principles, CSS animations, and user experience optimization.',
    challenges: 'Creating a search interface that mimics Google while keeping the code simple was an interesting challenge in balancing functionality with simplicity.'
  },
  'GolfScoreCard.html': {
    name: 'Golf Score Card',
    year: '2022',
    type: 'Coding',
    language: 'C#',
    status: 'Completed',
    description: 'A golf scorecard application built with C#. This application helps golfers track their scores across multiple holes and provides scoring statistics.',
    features: ['Score tracking', 'Hole-by-hole scoring', 'Statistics calculation', 'Score storage'],
    learnings: 'This project introduced me to desktop application development with C# and taught me about data management and calculation logic in a structured environment.',
    challenges: 'Building a user-friendly interface for score entry while ensuring data accuracy was the primary focus of this project.'
  },
  'GoogleHomePage2.html': {
    name: '2nd Google Home Page',
    year: 'December 2023',
    type: 'Coding',
    language: 'HTML, CSS & JS',
    status: 'Completed',
    description: 'My second Google homepage recreation, demonstrating improved understanding of semantic HTML and CSS layout techniques.',
    features: ['Search bar', 'Google-like styling', 'Responsive design', 'Navigation links'],
    learnings: 'This iteration improved my CSS skills and understanding of flexbox and grid layouts for creating professional-looking web pages.',
    challenges: 'Creating a visually similar design while maintaining clean, semantic HTML code.'
  },
  'HyperDriveHavoc.html': {
    name: 'HyperDrive Havoc',
    year: 'December 2023 - January 2024',
    type: 'Coding',
    language: 'Assembly C# (Unity)',
    status: 'Completed',
    description: 'A game developed using Unity and C#. HyperDrive Havoc is an action-packed game showcasing game development fundamentals including physics, collisions, and game loop mechanics.',
    features: ['Physics-based gameplay', 'Collision detection', 'Game mechanics', 'Player controls', 'Enemy AI basics'],
    learnings: 'Game development with Unity taught me about game loops, event-driven programming, and how to structure complex interactive applications. I learned about physics simulation and real-time rendering.',
    challenges: 'Managing game complexity, physics interactions, and creating engaging gameplay mechanics were significant challenges. Optimization for smooth gameplay was also important.'
  },
  'InterestsFormJarvis.html': {
    name: 'Interests Form - Linked to JARVIS',
    year: '2023',
    type: 'Coding',
    language: 'C#',
    status: 'Completed',
    description: 'A form-based application built with C# that integrates with the JARVIS system. This application collects user interests and preferences for processing within the larger JARVIS ecosystem.',
    features: ['User interest collection', 'Form validation', 'Data processing', 'JARVIS integration'],
    learnings: 'This project taught me about form handling, data validation, and integration between different application components.',
    challenges: 'Creating a seamless integration between the form and the JARVIS system required careful planning and data structure design.'
  },
  'IronManHelmet.html': {
    name: 'Iron Man Helmet',
    year: '2023',
    type: 'Manufacturing',
    language: 'N/A',
    status: 'Completed',
    description: 'A physical Iron Man helmet replica project created through 3D design and manufacturing. This project demonstrates skills in design, modeling, and physical construction.',
    features: ['3D design', 'Detailed replica', 'Structural engineering', 'Creative manufacturing'],
    learnings: 'This project taught me about 3D design principles, materials selection, and the challenges of translating digital designs into physical objects. I learned about different manufacturing techniques and material properties.',
    challenges: 'Translating the digital design into a wearable, safe replica required careful attention to proportions, structural integrity, and comfort. Material selection and durability were key concerns.'
  },
  'MarvelMovies.html': {
    name: 'Marvel Movies Project',
    year: '2022',
    type: 'Coding',
    language: 'C#',
    status: 'Completed',
    description: 'A C# application for managing and organizing information about Marvel movies. This project demonstrates data management and application structure with a focus on movie cataloging.',
    features: ['Movie database', 'Information organization', 'Search functionality', 'Data management'],
    learnings: 'Building this application taught me about structuring data, creating organized systems, and managing collections of information in code.',
    challenges: 'Organizing large datasets and creating an intuitive interface for browsing and searching were the main challenges.'
  },
  'NatureExplorer.html': {
    name: 'Nature Explorer',
    year: 'November - December 2023',
    type: 'Coding',
    language: 'Assembly C#',
    status: 'Completed',
    description: 'An interactive nature exploration application built with C#. The application showcases information about various natural features and wildlife with an engaging user interface.',
    features: ['Nature information database', 'Interactive exploration', 'Educational content', 'Multimedia integration'],
    learnings: 'This project deepened my understanding of building educational applications, managing content databases, and creating engaging user experiences.',
    challenges: 'Organizing and presenting large amounts of educational content in an engaging way was a key challenge. Creating an intuitive navigation system for exploring diverse content was important.'
  },
  'SkiTripDigitalTechGCSE.html': {
    name: 'Ski Trip Organiser - GCSE Digital Technology',
    year: '2021-2022',
    type: 'Coding',
    language: 'C#',
    status: 'Completed',
    description: 'A coursework project for GCSE Digital Technology that demonstrates the ability to create a functional application addressing a real-world problem. The Ski Trip Organiser helps manage and plan ski trips with scheduling and cost tracking.',
    features: ['Trip scheduling', 'Cost tracking', 'Itinerary management', 'Participant management'],
    learnings: 'This GCSE coursework project taught me how to approach a problem systematically, design solutions, implement them in code, and test thoroughly. I learned about user requirements and designing software to meet specific needs.',
    challenges: 'The main challenge was understanding and implementing user requirements while maintaining clean code structure. Creating a system that was both powerful and user-friendly required careful planning.'
  },
  'TechProjectGCSE.html': {
    name: 'GCSE Technology and Design Coursework Project',
    year: 'Jan \'22 - Jan \'23',
    type: 'Manufacturing',
    language: 'N/A',
    status: 'Completed',
    description: 'A full year GCSE Technology and Design coursework project demonstrating comprehensive design and manufacturing skills. This project shows the entire design process from concept through testing.',
    features: ['Complete design process', 'Technical drawings', 'Manufacturing execution', 'Testing and evaluation'],
    learnings: 'This extensive project taught me about the complete design-to-manufacturing pipeline, problem-solving under constraints, resource management, and iterative improvement through testing and feedback.',
    challenges: 'Managing a year-long project required planning, time management, and the ability to adapt designs based on practical constraints. Balancing aesthetic design with functional engineering was challenging.'
  },
  'WeatherWebApp.html': {
    name: 'Weather Web App',
    year: 'December 2023',
    type: 'Coding',
    language: 'HTML, CSS, JS',
    status: 'Completed',
    description: 'An interactive weather application that displays current weather information and forecasts. Built with vanilla JavaScript and styled with modern CSS, this app demonstrates API integration and real-time data handling.',
    features: ['Current weather display', 'Weather forecasting', 'Location-based data', 'Responsive interface', 'Real-time updates'],
    learnings: 'Building this app taught me about working with APIs, handling asynchronous requests, parsing JSON data, and creating interfaces that work with real-time information. I learned about weather data structures and presentation.',
    challenges: 'The main challenges were working with external APIs, handling API errors gracefully, and creating an interface that clearly presents complex weather data. Managing asynchronous operations and error handling for network requests was important.'
  },
  'Autoclicker.html': {
    name: 'Autoclicker',
    year: '2023',
    type: 'Coding',
    language: 'Python',
    status: 'Completed',
    description: 'A Python automation tool that can automatically perform mouse clicks at specified intervals. This utility application demonstrates understanding of automation, timing, and the Python libraries for system control.',
    features: ['Configurable click intervals', 'Multiple click patterns', 'Automation control', 'Easy configuration'],
    learnings: 'Building this automation tool taught me about Python libraries for system access (pyautogui, etc.), threading for event handling, and creating utility applications. I learned about automation principles and user control.',
    challenges: 'Creating reliable automation while providing clear user controls required careful handling of timing and system events. Ensuring accuracy in automating user input was important.'
  }
};

projectInfo['Website1.html'] = {
  name: '1st Personal Website',
  year: 'May - June 2023',
  type: 'Coding',
  language: 'HTML, CSS',
  status: 'Completed',
  description: 'My first personal website project, marking the beginning of my web development journey. This basic website showcased my early understanding of HTML structure and CSS styling, serving as a foundation for my future web development projects.',
  features: ['Basic HTML structure', 'CSS styling', 'Simple navigation', 'Personal branding'],
  learnings: 'This project taught me the fundamentals of web development, including HTML semantics, CSS layout techniques, and the importance of responsive design. It was my introduction to creating digital content and presenting myself online.',
  challenges: 'Creating a cohesive design from scratch without frameworks or templates was challenging. Learning to balance aesthetics with functionality and ensuring cross-browser compatibility were key learning points.'
};

projectInfo['PirelliF1Tyre.html'] = {
  name: 'Pirelli F1 Tyre',
  year: 'July - August 2023',
  type: 'Manufacturing',
  language: 'N/A',
  status: 'Completed',
  description: 'A manufacturing project focused on creating a replica Pirelli Formula 1 tire. This project demonstrates skills in precision manufacturing, material selection, and attention to detail in creating automotive components.',
  features: ['Precision manufacturing', 'Material research', 'Scale modeling', 'Detail-oriented construction'],
  learnings: 'This project deepened my understanding of manufacturing processes, material properties, and the engineering challenges involved in creating automotive components. I learned about tire construction, rubber compounds, and the precision required in F1 engineering.',
  challenges: 'Achieving the correct scale and detail while working with limited manufacturing equipment was challenging. Researching authentic tire specifications and selecting appropriate materials for the replica were key aspects of this project.'
};

function generateModernHTML(filename, info) {
  const basename = path.basename(filename, '.html');
  const navLink = filename === 'IronManHelmet.html' ? 'IronManHelmet.html' : filename;
  
  // Find actual image paths if they exist, otherwise use placeholder
  const imagePath = `../images/${basename}-hero.png`;

  const featuresHTML = info.features && info.features.length > 0 
    ? `
                    <section class="features-section">
                        <h2>Key Features</h2>
                        <ul class="features-list">
                            ${info.features.map(f => `<li>${f}</li>`).join('')}
                        </ul>
                    </section>`
    : '';

  const challengesHTML = info.challenges 
    ? `
                    <section class="challenges-section">
                        <h2>Challenges & Solutions</h2>
                        <p>${info.challenges}</p>
                    </section>`
    : '';

  const learningsHTML = info.learnings
    ? `
                    <section class="learnings-section">
                        <h2>What I Learned</h2>
                        <p>${info.learnings}</p>
                    </section>`
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${info.name} - Jack Maguire Portfolio</title>
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
                <span class="logo-symbol">&lt;/&gt;</span>
                <span>Jack Maguire</span>
            </a>
            <div class="nav-menu">
                <a href="../index.html#home" class="nav-link">Home</a>
                <a href="../index.html#about" class="nav-link">About</a>
                <a href="../index.html#projects" class="nav-link">Projects</a>
                <a href="../index.html#contact" class="nav-link">Contact</a>
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
                    <span>${info.name}</span>
                </div>
            </div>
        </div>
    </section>

    <!-- Project Content -->
    <section class="project-content">
        <div class="container">
            <div class="content-grid">
                <div class="main-content">
                    <h1>${info.name}</h1>
                    
                    <!-- Image Carousel -->
                    <div class="image-carousel">
                        <div class="carousel-container">
                            <!-- Slides will be populated by JavaScript -->
                        </div>
                        <div class="carousel-controls"></div>
                        <div class="carousel-info">Image gallery</div>
                    </div>

                    <!-- Project Actions -->
                    <div class="project-actions">
                        <button class="btn btn-edit">✏️ Edit Project</button>
                        <button class="btn btn-delete">🗑️ Delete Project</button>
                    </div>
                    
                    <div class="project-meta">
                        <div class="meta-item">
                            <span class="label">Year:</span>
                            <span>${info.year}</span>
                        </div>
                        <div class="meta-item">
                            <span class="label">Type:</span>
                            <span class="badge">${info.type}</span>
                        </div>
                        <div class="meta-item">
                            <span class="label">Technology:</span>
                            <span>${info.language}</span>
                        </div>
                        <div class="meta-item">
                            <span class="label">Status:</span>
                            <span class="status ${info.status.toLowerCase()}">${info.status}</span>
                        </div>
                    </div>

                    <section class="description-section">
                        <h2>About This Project</h2>
                        <p>${info.description}</p>
                    </section>

                    ${featuresHTML}

                    ${challengesHTML}

                    ${learningsHTML}
                </div>

                <aside class="sidebar">
                    <div class="sidebar-card">
                        <h3>Project Links</h3>
                        <a href="ProjectsTable.html" class="sidebar-link">Back to All Projects</a>
                    </div>

                    <div class="sidebar-card">
                        <h3>Project Details</h3>
                        <div class="details-list">
                            <div class="detail-item">
                                <span class="detail-label">Type:</span>
                                <span>${info.type}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Year:</span>
                                <span>${info.year}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Tech Stack:</span>
                                <span>${info.language}</span>
                            </div>
                            <div class="detail-item">
                                <span class="detail-label">Status:</span>
                                <span class="status ${info.status.toLowerCase()}">${info.status}</span>
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
            <h2>Explore More Projects</h2>
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

    <!-- Edit Project Modal -->
    <div class="modal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Edit Project</h2>
                <button class="modal-close">&times;</button>
            </div>
            <form class="edit-form">
                <div class="form-group">
                    <label for="projectName">Project Name</label>
                    <input type="text" id="projectName" name="projectName" required>
                </div>
                <div class="form-group">
                    <label for="projectYear">Year</label>
                    <input type="text" id="projectYear" name="projectYear">
                </div>
                <div class="form-group">
                    <label for="projectType">Type</label>
                    <select id="projectType" name="projectType">
                        <option value="Coding">Coding</option>
                        <option value="Manufacturing">Manufacturing</option>
                        <option value="Robotics">Robotics</option>
                        <option value="Electronics">Electronics</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="projectDescription">Description</label>
                    <textarea id="projectDescription" name="projectDescription" required></textarea>
                </div>
                <div class="modal-actions">
                    <button type="button" class="btn btn-secondary" onclick="document.querySelector('.modal').classList.remove('active')">Cancel</button>
                    <button type="submit" class="btn btn-primary">Save Changes</button>
                </div>
            </form>
        </div>
    </div>

    <script src="project-page.js"></script>
    <script src="project-page-enhanced.js"></script>
</body>
</html>`;
}

// Main conversion
const projectFiles = [
  'Calc.html',
  'FinanceWA.html',
  'GHP3.html',
  'GolfScoreCard.html',
  'GoogleHomePage2.html',
  'HyperDriveHavoc.html',
  'InterestsFormJarvis.html',
  'IronManHelmet.html',
  'MarvelMovies.html',
  'NatureExplorer.html',
  'SkiTripDigitalTechGCSE.html',
  'TechProjectGCSE.html',
  'WeatherWebApp.html',
  'Autoclicker.html',
  'Website1.html',
  'PirelliF1Tyre.html'
];

console.log('Converting project files to modern theme...\n');

projectFiles.forEach(file => {
  if (projectInfo[file]) {
    const modernHTML = generateModernHTML(file, projectInfo[file]);
    const outputPath = path.join(__dirname, 'HTML Pages', file);
    
    fs.writeFileSync(outputPath, modernHTML, 'utf8');
    console.log(`✓ Updated: ${file}`);
  } else {
    console.log(`⚠ No info for: ${file}`);
  }
});

console.log(`\n✨ Conversion complete! ${projectFiles.length} projects updated to modern theme.`);
