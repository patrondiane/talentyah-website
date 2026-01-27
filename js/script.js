const slides = document.querySelectorAll(".carousel-slide");
let current = 0;

function showSlide(index) {
  slides.forEach(slide => slide.classList.remove("active"));
  slides[index].classList.add("active");
}

setInterval(() => {
  current = (current + 1) % slides.length;
  showSlide(current);
}, 600); // lent = corporate


document.querySelectorAll('.pw-header').forEach(header => {
  header.addEventListener('click', () => {
    const content = header.nextElementSibling;
    const icon = header.querySelector('.pw-icon');

    const isOpen = content.style.display === 'block';

    document.querySelectorAll('.pw-content').forEach(c => c.style.display = 'none');
    document.querySelectorAll('.pw-icon').forEach(i => i.textContent = '+');

    if (!isOpen) {
      content.style.display = 'block';
      icon.textContent = '–';
    }
  });
});

document.querySelectorAll(".pw-header").forEach(header => {
  header.addEventListener("click", () => {
    const item = header.closest(".pw-item");
    const alreadyActive = item.classList.contains("active");

    document.querySelectorAll(".pw-item").forEach(i => i.classList.remove("active"));
    if (!alreadyActive) item.classList.add("active");
  });
});
