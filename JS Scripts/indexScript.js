//HACKER TEXT EFFECT
document.addEventListener('DOMContentLoaded', () => {
  setTimeout(() => {
    animateH1TextOnLoad();
  }, 500);
});

function animateH1TextOnLoad() {
  const h1Element = document.querySelector("h1");
  let interval;
  let iteration = 0;
  const letters = "abcdefghijklmnopqrstuvwxyz";

  clearInterval(interval);

  interval = setInterval(() => {
    h1Element.innerText = h1Element.innerText
      .split("")
      .map((letter, index) => {
        if (index < iteration) {
          return h1Element.dataset.value[index];
        }

        return letters[Math.floor(Math.random() * 26)];
      })
      .join("");

    if (iteration >= h1Element.dataset.value.length) {
      clearInterval(interval);
    }

    iteration += 1 / 1.5;
  }, 30);
}

//EMAIL SENT POPUP
function openPopup() {
  window.location.hash = 'openTitle';
}

//EMAIL JS
const btn = document.getElementById('button');
const form = document.querySelector('form');
const Email = document.getElementById('from_Email');
const ReEmail = document.getElementById('from_ReEmail');


form.addEventListener('submit', (e) => {
  e.preventDefault();

  const captchaResponse = grecaptcha.getResponse();

  if(!captchaResponse.length > 0){
    alert("Captcha not complete");
  }

  const fd = new FormData(e.target);
  const params = new URLSearchParams(fd);
  
  
  fetch('http://localhost:3000/upload',{
    method:'POST',
    body:params,
  })
  .then(res => res.json())
  .then(data => {
    if(data.captchaSuccess){
      console.log("Validation Successful");
      // Get the values of Email and ReEmail
      const emailValue = Email.value;
      const reEmailValue = ReEmail.value;

      // Check if Email and ReEmail are the same
      if (emailValue !== reEmailValue) {
          alert('Emails do not match. Please re-enter.');
          return;
      }
      

      // If emails match, proceed with sending the email
      btn.value = 'Sending...';

      const serviceID = 'default_service';
      const templateID = 'template_a4s18pd';

      emailjs.sendForm(serviceID, templateID, form)
      .then(() => {
          btn.value = 'Send Email';
          openPopup();
          alert('Email sent!');
      }, (err) => {
          btn.value = 'Email did not send.';
          console.log(JSON.stringify(err));
      });
    }
    else{
      alert("Validation from ReCAPTCHA was unsuccessful, refresh page and try again.");
    }
  })
  
});
