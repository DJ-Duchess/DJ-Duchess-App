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

const yearElement = document.getElementById('year');

if (yearElement) {
  yearElement.textContent = new Date().getFullYear();
}
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


// ========================================
// DJ DUCHESS — UPCOMING SHOWS
// ========================================

const showsContainer = document.getElementById('upcomingShows');

const SUPABASE_URL =
  'https://tugnmpaiqrshqvqvmbdm.supabase.co';

const SUPABASE_PUBLISHABLE_KEY =
  'sb_publishable_hS5I8K37UVSc52TXr8BO1w_Y_kbumlA';


// Create text safely
function showText(tag, value, className) {
  const element = document.createElement(tag);

  element.textContent = value;

  if (className) {
    element.className = className;
  }

  return element;
}


// Validate links
function safeWebUrl(value) {
  if (!value) return null;

  try {
    const url = new URL(value);

    return ['https:', 'http:'].includes(url.protocol)
      ? url.href
      : null;

  } catch {
    return null;
  }
}


// Today's date
function localToday() {
  const now = new Date();

  return (
    now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0')
  );
}


// Format show date
function formatShowDate(value) {
  const [year, month, day] = value.split('-').map(Number);

  return new Date(year, month - 1, day).toLocaleDateString(
    undefined,
    {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    }
  );
}


// ========================================
// CALENDAR DETAILS
// ========================================

function calendarDetails(show) {
  const day = show.event_date;

  const nextDay = new Date(`${day}T12:00:00Z`);
  nextDay.setUTCDate(nextDay.getUTCDate() + 1);

  const tomorrow = nextDay.toISOString().slice(0, 10);

  const compact = date => date.replaceAll('-', '');

  const clock = value =>
    (value || '').slice(0, 5).replace(':', '') + '00';

  const timed = Boolean(show.start_time);

  const start = timed
    ? `${compact(day)}T${clock(show.start_time)}`
    : compact(day);

  // If an end time isn't supplied, use a two-hour default.
  let endTime = show.end_time;
  let endDay = day;

  if (timed && !endTime) {
    const [hours, minutes] = show.start_time.split(':').map(Number);

    const endHour = hours + 2;

    endTime =
      `${String(endHour % 24).padStart(2, '0')}:` +
      `${String(minutes).padStart(2, '0')}`;

    if (endHour >= 24) {
      endDay = tomorrow;
    }
  } else if (
    timed &&
    endTime &&
    endTime <= show.start_time
  ) {
    endDay = tomorrow;
  }

  const end = timed
    ? `${compact(endDay)}T${clock(endTime)}`
    : compact(tomorrow);

  const venue = [
    show.venue_name,
    show.location
  ].filter(Boolean).join(', ');

  const description = [
    show.description,
    safeWebUrl(show.ticket_url) || ''
  ].filter(Boolean).join('\n');

  return {
    start,
    end,
    timed,
    venue,
    description,
    title: show.event_name || 'DJ Duchess Live'
  };
}


// ========================================
// APPLE CALENDAR DOWNLOAD
// ========================================

function downloadAppleCalendar(show) {
  const c = calendarDetails(show);

  const escapeICS = text =>
    String(text || '')
      .replace(/\\/g, '\\\\')
      .replace(/\n/g, '\\n')
      .replace(/,/g, '\\,')
      .replace(/;/g, '\\;');

  const stamp = new Date()
    .toISOString()
    .replace(/[-:]/g, '')
    .replace(/\.\d{3}/, '');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//DJ Duchess//Shows//EN',

    'BEGIN:VEVENT',

    `UID:duchess-show-${show.id}@dj-duchess.github.io`,

    `DTSTAMP:${stamp}`,

    c.timed
      ? `DTSTART;TZID=America/New_York:${c.start}`
      : `DTSTART;VALUE=DATE:${c.start}`,

    c.timed
      ? `DTEND;TZID=America/New_York:${c.end}`
      : `DTEND;VALUE=DATE:${c.end}`,

    `SUMMARY:${escapeICS(c.title)}`,

    `LOCATION:${escapeICS(c.venue)}`,

    `DESCRIPTION:${escapeICS(c.description)}`,

    'BEGIN:VALARM',
    'TRIGGER:-P1D',
    'ACTION:DISPLAY',

    `DESCRIPTION:${escapeICS(c.title)} tomorrow`,

    'END:VALARM',

    'END:VEVENT',
    'END:VCALENDAR'
  ];

  const blob = new Blob(
    [lines.join('\r\n') + '\r\n'],
    {
      type: 'text/calendar;charset=utf-8'
    }
  );

  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');

  link.href = url;

  link.download =
    `dj-duchess-show-${show.event_date}.ics`;

  document.body.append(link);

  link.click();

  link.remove();

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}


// ========================================
// ADD TO CALENDAR DROPDOWN
// ========================================

function addCalendarMenu(details, show) {
  const c = calendarDetails(show);

  const menu = document.createElement('details');

  menu.style.marginTop = '14px';

  const toggle = showText(
    'summary',
    '📅 ADD TO CALENDAR ▾'
  );

  toggle.style.cursor = 'pointer';
  toggle.style.fontWeight = 'bold';

  menu.append(toggle);

  const choices = document.createElement('div');

  Object.assign(choices.style, {
    display: 'flex',
    flexDirection: 'column',
    gap: '10px',
    marginTop: '12px'
  });


  // GOOGLE CALENDAR

  const google = new URL(
    'https://calendar.google.com/calendar/render'
  );

  google.searchParams.set('action', 'TEMPLATE');
  google.searchParams.set('text', c.title);

  google.searchParams.set(
    'dates',
    `${c.start}/${c.end}`
  );

  google.searchParams.set('details', c.description);
  google.searchParams.set('location', c.venue);

  if (c.timed) {
    google.searchParams.set(
      'ctz',
      'America/New_York'
    );
  }


  // OUTLOOK CALENDAR

  const outlook = new URL(
    'https://outlook.live.com/calendar/0/deeplink/compose'
  );

  outlook.searchParams.set(
    'path',
    '/calendar/action/compose'
  );

  outlook.searchParams.set('rru', 'addevent');
  outlook.searchParams.set('subject', c.title);
  outlook.searchParams.set('body', c.description);
  outlook.searchParams.set('location', c.venue);

  outlook.searchParams.set(
    'allday',
    String(!c.timed)
  );

  const isoLocal = compact =>
    `${compact.slice(0, 4)}-${compact.slice(4, 6)}-${compact.slice(6, 8)}` +
    (
      compact.length > 8
        ? `T${compact.slice(9, 11)}:${compact.slice(11, 13)}:00`
        : ''
    );

  outlook.searchParams.set(
    'startdt',
    isoLocal(c.start)
  );

  outlook.searchParams.set(
    'enddt',
    isoLocal(c.end)
  );


  // CALENDAR LINKS

  const links = [
    ['Google Calendar ↗', google.href],
    ['Outlook Calendar ↗', outlook.href]
  ];

  for (const [label, href] of links) {
    const link = showText('a', label);

    link.href = href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';

    link.style.color = '#f8e7b7';

    choices.append(link);
  }


  // APPLE CALENDAR

  const apple = showText(
    'button',
    'Apple Calendar / Download .ics'
  );

  apple.type = 'button';

  Object.assign(apple.style, {
    background: 'transparent',
    color: '#f8e7b7',
    border: '1px solid #c6a34a',
    borderRadius: '5px',
    padding: '8px',
    cursor: 'pointer',
    textAlign: 'left'
  });

  apple.addEventListener('click', () => {
    downloadAppleCalendar(show);
  });

  choices.append(apple);

  menu.append(choices);

  details.append(menu);
}


// ========================================
// LOAD SHOWS FROM DUCHESS HQ
// ========================================

async function loadUpcomingShows() {
  if (!showsContainer) return;

  try {
    const query = new URLSearchParams({
      select:
        'id,event_name,event_date,start_time,end_time,venue_name,location,description,flyer_url,ticket_url',

      event_date: `gte.${(() => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);

  return (
    yesterday.getFullYear() + '-' +
    String(yesterday.getMonth() + 1).padStart(2, '0') + '-' +
    String(yesterday.getDate()).padStart(2, '0')
  );
})()}`,

      order: 'event_date.asc,start_time.asc'
    });

    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/public_shows?${query}`,
      {
        headers: {
          apikey: SUPABASE_PUBLISHABLE_KEY
        }
      }
    );

    if (!response.ok) {
      throw new Error(
        `Public shows request failed (${response.status})`
      );
    }

    const shows = await response.json();

    if (!Array.isArray(shows)) {
      throw new Error('Unexpected public shows response');
    }

    showsContainer.replaceChildren();


    // NO UPCOMING SHOWS

    if (!shows.length) {
      const empty = showText(
        'p',
        'New dates coming soon. Check back for show announcements!',
        'panel'
      );

      showsContainer.append(empty);

      return;
    }


    // EVENT GRID

    const grid = document.createElement('div');

    grid.className = 'duchess-show-grid';

    Object.assign(grid.style, {
      display: 'grid',
      gridTemplateColumns:
        'repeat(auto-fit, minmax(min(100%, 260px), 1fr))',
      gap: '20px',
      marginTop: '20px'
    });

    // HIDE EVENTS ONLY AFTER THEY HAVE ENDED
    const upcomingShows = shows.filter(show => {
      if (!show.event_date) return false;

      // Events without a start time stay visible through their date
      if (!show.start_time) {
        return show.event_date >= localToday();
      }

      const start = new Date(
        `${show.event_date}T${show.start_time}`
      );

      if (Number.isNaN(start.getTime())) {
        return false;
      }

      let end;

      if (show.end_time) {
        end = new Date(
          `${show.event_date}T${show.end_time}`
        );

        // Handle events ending after midnight
        if (end <= start) {
          end.setDate(end.getDate() + 1);
        }
      } else {
        // Default to two hours if no end time is entered
        end = new Date(
          start.getTime() + 2 * 60 * 60 * 1000
        );
      }

      return new Date() < end;
    });

    // SHOW MESSAGE WHEN ALL EVENTS HAVE ENDED
    if (upcomingShows.length === 0) {
      showsContainer.append(
        showText(
          'p',
          'New dates coming soon. Check back for show announcements!',
          'panel'
        )
      );

      return;
    }
       // BUILD EACH EVENT CARD
    for (const show of upcomingShows) {
      const card = document.createElement('article');

      card.className = 'duchess-show-card';

      Object.assign(card.style, {
        background: '#17150e',
        color: '#f8e7b7',
        border: '1px solid #c6a34a',
        borderRadius: '14px',
        overflow: 'hidden',
        padding: '0 0 20px'
      });


      // EVENT FLYER

      const flyer = safeWebUrl(show.flyer_url);

      if (flyer) {
        const image = document.createElement('img');

        image.src = flyer;

        image.alt =
          `Flyer for ${show.event_name || 'DJ Duchess event'}`;

        image.loading = 'lazy';

        Object.assign(image.style, {
          width: '100%',
          maxHeight: '360px',
          objectFit: 'contain',
          display: 'block'
        });

        card.append(image);

      } else {

        // BLACK AND GOLD CARD WITHOUT FLYER

        const artwork = document.createElement('div');

        artwork.textContent = '✳  DJ DUCHESS  👑';

        Object.assign(artwork.style, {
          background:
            'linear-gradient(145deg, #090909, #44300c)',
          color: '#e6b84a',
          padding: '52px 14px',
          fontWeight: 'bold',
          textAlign: 'center',
          letterSpacing: '0.15em'
        });

        card.append(artwork);
      }


      // EVENT DETAILS

      const details = document.createElement('div');

      details.style.padding = '18px 18px 0';

      details.append(
        showText(
          'p',
          formatShowDate(show.event_date),
          'kicker'
        )
      );

      details.append(
        showText(
          'h3',
          show.event_name || 'DJ Duchess Live'
        )
      );

      const venue = [
        show.venue_name,
        show.location
      ].filter(Boolean).join(' · ');

      if (venue) {
        details.append(showText('p', venue));
      }

      if (show.start_time) {
        const [hours, minutes] =
          show.start_time.split(':').map(Number);

        const timeLabel = new Date(
          2000, 0, 1, hours, minutes
        ).toLocaleTimeString(undefined, {
          hour: 'numeric',
          minute: '2-digit'
        });

        details.append(showText('p', timeLabel));
      }

    if (show.description) {
  const description = showText('p', show.description);

  description.style.whiteSpace = 'pre-line';

  details.append(description);
}


      // TICKETS / RSVP BUTTON

      const ticketUrl = safeWebUrl(show.ticket_url);

      if (ticketUrl) {
        const link = showText(
          'a',
          'TICKETS / RSVP ↗',
          'button primary'
        );

        link.href = ticketUrl;

        link.target = '_blank';

        link.rel = 'noopener noreferrer';

        details.append(link);
      }


      // ADD TO CALENDAR MENU

      addCalendarMenu(details, show);


      card.append(details);

      grid.append(card);
    }

    showsContainer.append(grid);

  } catch (error) {
    console.error('Upcoming Shows error:', error);

    showsContainer.replaceChildren(
      showText(
        'p',
        'Upcoming shows are temporarily unavailable. Please check back soon.',
        'panel'
      )
    );
  }
}


// ========================================
// START UPCOMING SHOWS
// ========================================

// Load events when the website opens
loadUpcomingShows();

// Refresh events automatically every 5 minutes
setInterval(loadUpcomingShows, 5 * 60 * 1000);e
