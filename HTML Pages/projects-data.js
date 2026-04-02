const projectsData = [
    {
        name: "JARVIS",
        year: "2022 - Present",
        type: "Coding",
        language: "Python",
        link: "https://jmagdev1.github.io/JARVISWebsite/"
    },
    {
        name: "Google Homepage",
        year: "2023",
        type: "Coding",
        language: "HTML, CSS",
        link: "https://jmagdev1.github.io/GHP_Original/"
    },
    {
        name: "Iron Man Helmet",
        year: "2023",
        type: "Manufacturing",
        language: "N/A",
        link: "IronManHelmet.html"
    },
    {
        name: "Ski Trip Organiser - GCSE Digital Technology",
        year: "2021-2022",
        type: "Coding",
        language: "C#",
        link: "SkiTripDigitalTechGCSE.html"
    },
    {
        name: "Golf Score Card",
        year: "2022",
        type: "Coding",
        language: "C#",
        link: "GolfScoreCard.html"
    },
    {
        name: "Marvel Movies Project",
        year: "2022",
        type: "Coding",
        language: "C#",
        link: "MarvelMovies.html"
    },
    {
        name: "Autoclicker",
        year: "2023",
        type: "Coding",
        language: "Python",
        link: "Autoclicker.html"
    },
    {
        name: "Interests Form - Linked to JARVIS",
        year: "2023",
        type: "Coding",
        language: "C#",
        link: "InterestsFormJarvis.html"
    },
    {
        name: "GCSE Technology and Design Coursework Project",
        year: "Jan '22 - Jan '23",
        type: "Manufacturing",
        language: "N/A",
        link: "TechProjectGCSE.html"
    },
    {
        name: "Calculator",
        year: "June 2023",
        type: "Coding",
        language: "HTML, CSS & JS",
        link: "Calc.html"
    },
    {
        name: "Finance Web App",
        year: "June - August 2023",
        type: "Coding",
        language: "HTML, CSS & JS",
        link: "FinanceWA.html"
    },
    {
        name: "2nd Google Home Page",
        year: "December 2023",
        type: "Coding",
        language: "HTML, CSS & JS",
        link: "https://jmagdev1.github.io/Google-Home/"
    },
    {
        name: "1st Personal Website",
        year: "May - June 2023",
        type: "Coding",
        language: "HTML, CSS",
        link: "Website1.html"
    },
    {
        name: "Nature Explorer",
        year: "November - December 2023",
        type: "Coding",
        language: "Assembly C#",
        link: "NatureExplorer.html"
    },
    {
        name: "Pirelli F1 Tyre",
        year: "July - August 2023",
        type: "Manufacturing",
        language: "N/A",
        link: "PirelliF1Tyre.html"
    },
    {
        name: "HyperDrive Havoc",
        year: "December 2023 - January 2024",
        type: "Coding",
        language: "Assembly C# (Unity)",
        link: "HyperDriveHavoc.html"
    },
    {
        name: "Google Home Page 3",
        year: "February 2024",
        type: "Coding",
        language: "HTML, CSS, JS",
        link: "GHP3.html"
    },
    {
        name: "Weather Web App",
        year: "December 2023",
        type: "Coding",
        language: "HTML, CSS, JS",
        link: "WeatherWebApp.html"
    }
];

// Function to extract year for sorting
function getYearValue(yearString) {
    const match = yearString.match(/(\d{4})/);
    return match ? parseInt(match[0]) : 0;
}
