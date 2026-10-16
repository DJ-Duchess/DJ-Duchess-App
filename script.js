const toggle = document.getElementById('menuToggle');
const nav = document.getElementById('nav');

toggle.addEventListener('click', () => {
  const open = nav.classList.toggle('open');
  toggle.setAttribute('aria-expanded', String(open));
});

nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
  nav.classList.remove('open');
  toggle.setAttribute('aria-expanded', 'false');
}));

document.getElementById('year').textContent = new Date().getFullYear();

const bookingForm = document.getElementById('bookingForm');
const formMessage = document.getElementById('formMessage');

bookingForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const form = event.currentTarget;
  const data = new FormData(form);
  const submitButton = form.querySelector('[type="submit"]');

  const booking = {
    client_name: data.get('client'),
    client_email: data.get('email'),
    event_date: data.get('date'),
    event_type: data.get('eventType'),
    guest_count: null,
    event_setting: data.get('setting'),
    venue_name: data.get('venue'),
    start_time: data.get('startTime') || null,
    set_duration: data.get('duration'),
    budget: data.get('budget'),
    equipment_needs: data.get('equipment'),
    music_genres: data.getAll('genre'),
    other_genre: data.get('otherGenre') || null,
    additional_details: data.get('details') || null,
    website: data.get('website') || ''
  };

  const guestCount = data.get('guests');
  if (guestCount) {
    booking.additional_details =
      `Estimated guests: ${guestCount}\n` +
      `Venue size: ${data.get('venueSize') || 'Not specified'}\n` +
      (booking.additional_details || '');
  }

  try {
    if (submitButton) submitButton.disabled = true;
    formMessage.textContent = 'Sending your booking inquiry...';

    const response = await fetch(
      'https://tugnmpaiqrshqvqvmbdm.supabase.co/functions/v1/submit-booking',
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(booking)
      }
    );

    const result = await response.json();

    if (!response.ok || !result.success) {
      throw new Error(result.error || 'Submission failed');
    }

    formMessage.textContent =
      'Thank you! Your booking inquiry has been received. DJ Duchess will be in touch!';
    form.reset();

  } catch (error) {
    console.error('Booking submission error:', error);
    formMessage.textContent =
      'Sorry, your inquiry could not be sent. Please try again.';
  } finally {
    if (submitButton) submitButton.disabled = false;
  }
});
