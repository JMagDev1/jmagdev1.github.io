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

// Smooth scrolling for anchor links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
        e.preventDefault();
        const target = document.querySelector(this.getAttribute('href'));
        if (target) {
            target.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    });
});

// Scroll animations - reveal elements as they come into view
const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
};

const observer = new IntersectionObserver(function(entries) {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            entry.target.style.opacity = '1';
            entry.target.style.transform = 'translateY(0)';
            observer.unobserve(entry.target);
        }
    });
}, observerOptions);

// Apply animations to elements
const elementsToAnimate = document.querySelectorAll(
    '.project-card, .education-item, .skill-item, .section-header'
);

elementsToAnimate.forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'opacity 0.6s ease, transform 0.6s ease';
    observer.observe(el);
});

// Contact Form Handler with EmailJS and CAPTCHA
const contactForm = document.getElementById('contactForm');
const contactSuccess = document.getElementById('contactSuccess');
const captchaQuestion = document.getElementById('captchaQuestion');
const captchaAnswer = document.getElementById('captchaAnswer');

// CAPTCHA variables
let correctCaptchaAnswer = 0;

// Generate random math problem
function generateCaptcha() {
    const num1 = Math.floor(Math.random() * 10) + 1;
    const num2 = Math.floor(Math.random() * 10) + 1;
    const operations = ['+', '-', '*'];
    const operation = operations[Math.floor(Math.random() * operations.length)];

    let question, answer;
    switch(operation) {
        case '+':
            question = `${num1} + ${num2}`;
            answer = num1 + num2;
            break;
        case '-':
            question = `${num1 + num2} - ${num1}`;
            answer = num2;
            break;
        case '*':
            question = `${num1} × ${num2}`;
            answer = num1 * num2;
            break;
    }

    captchaQuestion.textContent = `What is ${question}?`;
    correctCaptchaAnswer = answer;
}

// Initialize EmailJS and CAPTCHA
(function() {
    // Initialize EmailJS with your public key
    emailjs.init("YOUR_PUBLIC_KEY"); // Replace with your actual EmailJS public key

    // Generate initial CAPTCHA
    generateCaptcha();
})();

if (contactForm) {
    contactForm.addEventListener('submit', function(e) {
        e.preventDefault();

        // Validate CAPTCHA
        const userAnswer = parseInt(captchaAnswer.value);
        if (userAnswer !== correctCaptchaAnswer) {
            alert('Please solve the math problem correctly to prove you\'re human.');
            generateCaptcha(); // Generate new problem
            captchaAnswer.value = '';
            return;
        }

        // Get form data
        const data = {
            from_name: this.querySelector('input[placeholder="Your Name"]').value,
            from_email: this.querySelector('input[type="email"]').value,
            subject: this.querySelector('input[placeholder="Subject"]').value || 'Contact Form Submission',
            message: this.querySelector('textarea').value,
            to_name: 'Jack Maguire'
        };

        // Show loading state
        const submitBtn = this.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Sending...';
        submitBtn.disabled = true;

        // Send email using EmailJS
        emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', data)
            .then(function(response) {
                console.log('Email sent successfully:', response);

                // Show success message
                contactSuccess.style.display = 'block';

                // Reset form
                contactForm.reset();

                // Generate new CAPTCHA
                generateCaptcha();

                // Reset button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;

                // Hide success message after 5 seconds
                setTimeout(() => {
                    contactSuccess.style.display = 'none';
                }, 5000);

            }, function(error) {
                console.error('Email sending failed:', error);
                alert('Sorry, there was an error sending your message. Please try again later or contact me directly at jack@example.com');

                // Reset button
                submitBtn.textContent = originalText;
                submitBtn.disabled = false;
            });
    });
}

// Active nav link highlight on scroll
window.addEventListener('scroll', () => {
    let current = '';
    
    const sections = document.querySelectorAll('section');
    sections.forEach(section => {
        const sectionTop = section.offsetTop;
        const sectionHeight = section.clientHeight;
        if (pageYOffset >= sectionTop - 200) {
            current = section.getAttribute('id');
        }
    });
    
    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + current) {
            link.classList.add('active');
            link.style.color = 'var(--primary-color)';
        } else {
            link.style.color = '';
        }
    });
});

// Navbar background on scroll
window.addEventListener('scroll', () => {
    const navbar = document.querySelector('.navbar');
    if (window.scrollY > 50) {
        navbar.style.boxShadow = '0 10px 30px rgba(99, 102, 241, 0.1)';
    } else {
        navbar.style.boxShadow = 'none';
    }
});

// Lazy load images
const images = document.querySelectorAll('img');
const imageObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        if (entry.isIntersecting) {
            const img = entry.target;
            img.src = img.dataset.src || img.src;
            img.classList.add('loaded');
            observer.unobserve(img);
        }
    });
});

images.forEach(img => {
    imageObserver.observe(img);
});

// Parallax effect on scroll
window.addEventListener('scroll', () => {
    const scrollTop = window.scrollY;
    const heroContent = document.querySelector('.hero-content');
    
    if (heroContent) {
        heroContent.style.transform = `translateY(${scrollTop * 0.5}px)`;
    }
});

// Add keyboard accessibility
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && navMenu && navMenu.classList.contains('active')) {
        navMenu.classList.remove('active');
        if (hamburger) hamburger.classList.remove('active');
    }
});

// Initialize
console.log('Portfolio website loaded successfully!');
