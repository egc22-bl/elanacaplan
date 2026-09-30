const classesRoot = document.querySelector('#classes');
const classesStatus = document.querySelector('#classes-status');
const signupForm = document.querySelector('#signup-form');
const signupError = document.querySelector('#signup-error');
const done = document.querySelector('#done');
const doneList = document.querySelector('#done-list');
const cancelForm = document.querySelector('#cancel-form');
const cancelError = document.querySelector('#cancel-error');
const cancelResults = document.querySelector('#cancel-results');

function dateChoice(item, entry, checked) {
  const label = document.createElement('label');
  label.className = 'choice';
  const input = document.createElement('input');
  input.type = 'checkbox';
  input.className = 'date-toggle';
  input.value = entry.date;
  input.checked = checked;
  const span = document.createElement('span');
  span.textContent = entry.dateLabel;
  label.append(input, span);
  return label;
}

function classRow(item) {
  const wrap = document.createElement('div');
  wrap.className = 'class';
  const boxId = `class-${item.id}`;
  const label = document.createElement('label');
  label.className = 'main';
  label.htmlFor = boxId;
  const box = document.createElement('input');
  box.type = 'checkbox';
  box.className = 'class-toggle';
  box.id = boxId;
  box.value = item.id;
  const text = document.createElement('span');
  text.textContent = item.label;
  label.append(box, text);

  const choices = document.createElement('div');
  choices.className = 'choices';
  choices.hidden = true;
  const dateInputs = [];
  let firstOpen = true;
  for (const entry of item.dates) {
    if (entry.closed) {
      const closed = document.createElement('p');
      closed.className = 'closed';
      closed.textContent = `${entry.dateLabel} — No classes, ${entry.holiday}`;
      choices.append(closed);
      continue;
    }
    const choice = dateChoice(item, entry, firstOpen);
    firstOpen = false;
    dateInputs.push(choice.querySelector('input'));
    choices.append(choice);
  }
  const everyLabel = document.createElement('label');
  everyLabel.className = 'choice';
  const every = document.createElement('input');
  every.type = 'checkbox';
  every.id = `every-${item.id}`;
  every.className = 'every-toggle';
  const everyText = document.createElement('span');
  everyText.textContent = `Every week, starting ${item.everyWeekLabel}`;
  everyLabel.append(every, everyText);
  choices.append(everyLabel);
  every.addEventListener('change', () => {
    for (const input of dateInputs) {
      input.disabled = every.checked;
      if (every.checked) input.checked = false;
    }
  });
  box.addEventListener('change', () => {
    choices.hidden = !box.checked;
    if (!box.checked) {
      every.checked = false;
      for (const input of dateInputs) {
        input.disabled = false;
        input.checked = false;
      }
      if (dateInputs[0]) dateInputs[0].checked = true;
    }
  });
  wrap.append(label, choices);
  return wrap;
}

function renderDays(days, closures) {
  const closureRoot = document.querySelector('#closures');
  closureRoot.replaceChildren();
  for (const closure of closures) {
    const note = document.createElement('p');
    note.className = 'closure';
    note.textContent = `No classes on ${closure.dateLabel} — ${closure.name}.`;
    closureRoot.append(note);
  }
  classesRoot.replaceChildren();
  for (const day of days) {
    const heading = document.createElement('p');
    heading.className = 'day';
    heading.textContent = day.name;
    classesRoot.append(heading);
    for (const item of day.classes) classesRoot.append(classRow(item));
  }
  classesStatus.hidden = true;
}

async function loadClasses() {
  try {
    const response = await fetch('/api/classes');
    if (!response.ok) throw new Error('load failed');
    const body = await response.json();
    renderDays(body.days, body.closures ?? []);
  } catch {
    classesStatus.textContent = 'The class list didn’t load. Refresh the page.';
  }
}

function selectedClasses() {
  const picks = [];
  for (const box of classesRoot.querySelectorAll('input.class-toggle:checked')) {
    const every = document.querySelector(`#every-${box.value}`);
    if (every?.checked) {
      picks.push({ id: box.value, mode: 'weekly' });
      continue;
    }
    const dates = [...box.closest('.class').querySelectorAll('input.date-toggle:checked')];
    if (!dates.length) return { error: 'Choose a date for each class.' };
    for (const date of dates) picks.push({ id: box.value, mode: 'once', date: date.value });
  }
  if (!picks.length) return { error: 'Choose a class.' };
  return { picks };
}

signupForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  signupError.textContent = '';
  const data = new FormData(signupForm);
  const selected = selectedClasses();
  if (selected.error) {
    signupError.textContent = selected.error;
    return;
  }
  const button = signupForm.querySelector('button');
  button.disabled = true;
  try {
    const response = await fetch('/api/signups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: data.get('name'),
        email: data.get('email'),
        phone: data.get('phone'),
        classes: selected.picks,
      }),
    });
    const body = await response.json();
    if (!response.ok || !body.ok) {
      signupError.textContent = body.error || 'Something went wrong. Try again.';
      return;
    }
    doneList.replaceChildren();
    for (const item of body.saved) {
      const li = document.createElement('li');
      li.textContent = item.mode === 'weekly'
        ? `${item.label} — every week, starting ${item.dateLabel}`
        : `${item.label} — ${item.dateLabel}`;
      doneList.append(li);
    }
    signupForm.hidden = true;
    done.hidden = false;
  } catch {
    signupError.textContent = 'Something went wrong. Try again.';
  } finally {
    button.disabled = false;
  }
});

document.querySelector('#again').addEventListener('click', () => {
  for (const box of classesRoot.querySelectorAll('input.class-toggle')) {
    box.checked = false;
    box.dispatchEvent(new Event('change'));
  }
  done.hidden = true;
  signupForm.hidden = false;
  signupForm.querySelector('input[name="name"]').focus();
});

function renderSpots(email, phone, classes) {
  cancelResults.replaceChildren();
  if (!classes.length) {
    const p = document.createElement('p');
    p.className = 'lede';
    p.textContent = "We don't have a signup for that email and phone.";
    cancelResults.append(p);
    return;
  }
  for (const spot of classes) {
    const card = document.createElement('div');
    card.className = 'spot';
    const title = document.createElement('p');
    title.textContent = spot.mode === 'weekly'
      ? `${spot.label} — every week, next is ${spot.nextDateLabel}`
      : `${spot.label} — ${spot.nextDateLabel}`;
    card.append(title);
    if (spot.mode === 'weekly') {
      card.append(
        actionButton(`Skip ${spot.nextDateLabel}`, () => removeSpot(email, phone, spot.classId, 'skip')),
        actionButton('Stop coming every week', () => removeSpot(email, phone, spot.classId, 'stop')),
      );
    } else {
      card.append(actionButton(`Remove ${spot.nextDateLabel}`, () => removeSpot(email, phone, spot.classId, 'drop', spot.date)));
    }
    cancelResults.append(card);
  }
}

function actionButton(text, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'quiet';
  button.textContent = text;
  button.addEventListener('click', onClick);
  return button;
}

async function removeSpot(email, phone, classId, action, date) {
  cancelError.textContent = '';
  const response = await fetch('/api/cancel', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, phone, classId, action, date }),
  });
  const body = await response.json();
  if (!response.ok || !body.ok) {
    cancelError.textContent = body.error || 'Something went wrong. Try again.';
    return;
  }
  await findClasses(email, phone);
}

async function findClasses(email, phone) {
  const response = await fetch('/api/cancel/lookup', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, phone }),
  });
  const body = await response.json();
  renderSpots(email, phone, body.classes ?? []);
}

cancelForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  cancelError.textContent = '';
  const data = new FormData(cancelForm);
  const button = cancelForm.querySelector('button');
  button.disabled = true;
  try {
    await findClasses(data.get('email'), data.get('phone'));
  } catch {
    cancelError.textContent = 'Something went wrong. Try again.';
  } finally {
    button.disabled = false;
  }
});

loadClasses();
