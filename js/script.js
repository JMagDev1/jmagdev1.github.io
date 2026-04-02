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

// Tech Carousel Functionality
class TechCarousel {
    constructor() {
        this.slides = document.querySelectorAll('.tech-slide');
        this.currentSlide = 0;
        this.interval = null;
        this.init();
    }

    init() {
        if (this.slides.length === 0) return;

        // Show first slide
        this.slides[0].classList.add('active');

        // Start automatic cycling
        this.startCarousel();

        // Pause on hover
        const carousel = document.querySelector('.tech-carousel');
        if (carousel) {
            carousel.addEventListener('mouseenter', () => this.stopCarousel());
            carousel.addEventListener('mouseleave', () => this.startCarousel());
        }
    }

    startCarousel() {
        this.interval = setInterval(() => {
            this.nextSlide();
        }, 3000); // Change slide every 3 seconds
    }

    stopCarousel() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    nextSlide() {
        // Remove active class from current slide
        this.slides[this.currentSlide].classList.remove('active');
        this.slides[this.currentSlide].classList.add('leaving');

        // Move to next slide
        this.currentSlide = (this.currentSlide + 1) % this.slides.length;

        // Show next slide
        setTimeout(() => {
            this.slides.forEach(slide => slide.classList.remove('leaving'));
            this.slides[this.currentSlide].classList.add('active');
        }, 300);
    }
}

// Initialize carousel when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new TechCarousel();
});

// Initialize
console.log('Portfolio website loaded successfully!');
