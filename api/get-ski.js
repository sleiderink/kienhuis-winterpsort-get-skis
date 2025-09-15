  // De API-sleutel is nu veilig opgeslagen als een omgevingsvariabele in Netlify.
  // De website roept nu een Netlify Function aan, die de sleutel intern gebruikt.
  const airtableConfig = {
      baseId: 'appB9GQhuY38AW2uT',
      tableName: 'Ski Finder',
  };

  let userChoices = {
      gender: null,
      ability: null,
      piste: null,
      speed: null,
      turns: null,
      price: null,
      height: null
  };

  let currentStep = 1;

  const steps = {
      1: 'step-1',
      2: 'step-2',
      3: 'step-3',
      4: 'step-4',
      5: 'step-5',
      6: 'step-6',
      7: 'step-7'
  };

  const stepsContainer = document.getElementById('steps-container');
  const resultsSection = document.getElementById('results-section');
  const resultsContainer = document.getElementById('results-container');
  const noResultsMessage = document.getElementById('no-results-message');
  const errorMessage = document.getElementById('error-message');
  const apiErrorMessage = document.getElementById('api-error-message');
  const heightInput = document.getElementById('height-input');
  const findSkisBtn = document.getElementById('find-skis-btn');
  const loaderOverlay = document.getElementById('loader-overlay');
  const backBtn = document.getElementById('back-btn');
  const resetBtn = document.getElementById('reset-btn');
  const recommendedLengthDisplay = document.getElementById('recommended-length-display');

  // Initial render
  showStep(currentStep);

  function showStep(step) {
      Object.values(steps).forEach(id => {
          const element = document.getElementById(id);
          if (element) {
              element.classList.add('hidden');
          }
      });
      const stepElement = document.getElementById(steps[step]);
      if (stepElement) {
          stepElement.classList.remove('hidden');
      }

      if (step > 1 && backBtn) {
          backBtn.classList.remove('hidden');
      } else if (backBtn) {
          backBtn.classList.add('hidden');
      }
  }

  function handleButtonClick(event, category) {
      const button = event.target.closest(`.${category}-btn`);
      if (!button) {
          console.error(`Fout: Knop met klasse '.${category}-btn' niet gevonden.`);
          return;
      }

      console.log(`Knop geklikt voor categorie: ${category}, waarde: ${button.dataset.value}`);
      const buttons = document.querySelectorAll(`.${category}-btn`);
      buttons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      userChoices[category] = button.dataset.value;

      currentStep++;
      if (currentStep <= 7) {
          showStep(currentStep);
      }
  }

  document.querySelectorAll('.gender-btn').forEach(btn => {
      btn.addEventListener('click', (e) => handleButtonClick(e, 'gender'));
  });

  document.querySelectorAll('.ability-btn').forEach(btn => {
      btn.addEventListener('click', (e) => handleButtonClick(e, 'ability'));
  });

  document.querySelectorAll('.piste-btn').forEach(btn => {
      btn.addEventListener('click', (e) => handleButtonClick(e, 'piste'));
  });

  document.querySelectorAll('.speed-btn').forEach(btn => {
      btn.addEventListener('click', (e) => handleButtonClick(e, 'speed'));
  });

  document.querySelectorAll('.turns-btn').forEach(btn => {
      btn.addEventListener('click', (e) => handleButtonClick(e, 'turns'));
  });

  document.querySelectorAll('.price-btn').forEach(btn => {
      btn.addEventListener('click', (e) => handleButtonClick(e, 'price'));
  });

  findSkisBtn.addEventListener('click', (e) => {
      e.preventDefault();
      handleFindSkis();
  });

  heightInput.addEventListener('keyup', (event) => {
      if (event.key === 'Enter') {
          handleFindSkis();
      }
  });

  backBtn.addEventListener('click', (e) => {
      e.preventDefault();
      currentStep--;
      showStep(currentStep);
  });

  resetBtn.addEventListener('click', (e) => {
      e.preventDefault();
      if (resultsSection) resultsSection.classList.add('hidden');
      if (stepsContainer) stepsContainer.classList.remove('hidden');
      if (recommendedLengthDisplay) recommendedLengthDisplay.classList.add('hidden');
      if (resetBtn) resetBtn.classList.add('hidden');
      currentStep = 1;
      userChoices = { gender: null, ability: null, piste: null, speed: null, turns: null, price: null, height: null };
      document.querySelectorAll('.btn').forEach(btn => btn.classList.remove('active'));
      if (heightInput) heightInput.value = '';
      showStep(currentStep);
  });

  function handleFindSkis() {
      console.log('Functie handleFindSkis gestart.');
      const height = parseInt(heightInput.value, 10);
      if (isNaN(height) || height < 100 || height > 220) {
          if (errorMessage) {
              errorMessage.textContent = 'Vul een geldige lengte in (tussen 100 en 220 cm).';
              errorMessage.classList.remove('hidden');
          }
          console.log('Ongeldige lengte ingevoerd:', height);
          return;
      }
      userChoices.height = height;
      if (errorMessage) errorMessage.classList.add('hidden');
      console.log('Geldige lengte ingevoerd. User Choices:', userChoices);

      document.getElementById('step-7').classList.add('hidden');
      findMatchingSkis();
  }

  function interpolateColor(color1, color2, factor) {
      if (factor > 1) factor = 1;
      if (factor < 0) factor = 0;

      var result = color1.slice();
      for (var i = 0; i < 3; i++) {
          result[i] = Math.round(result[i] + factor * (color2[i] - color1[i]));
      }
      return 'rgb(' + result.join(',') + ')';
  }

  async function findMatchingSkis() {
      console.log('Functie findMatchingSkis gestart. Zoeken naar matchen...');
      if (resultsContainer) resultsContainer.innerHTML = '';
      if (stepsContainer) stepsContainer.classList.add('hidden');
      if (resultsSection) resultsSection.classList.remove('hidden');
      if (noResultsMessage) noResultsMessage.classList.add('hidden');
      if (apiErrorMessage) apiErrorMessage.classList.add('hidden');
      if (resetBtn) resetBtn.classList.remove('hidden');
      if (backBtn) backBtn.classList.add('hidden');
      if (loaderOverlay) loaderOverlay.classList.remove('hidden');

      let allSkis = [];
      const timeout = 10000;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      try {
          // Nieuwe URL die naar je Netlify Function wijst
          const functionUrl = '/.netlify/functions/get-skis';

          const response = await fetch(functionUrl, {
              method: 'POST',
              headers: {
                  'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                  baseId: airtableConfig.baseId,
                  tableName: airtableConfig.tableName
              }),
              signal: controller.signal
          });
          clearTimeout(timeoutId);

          if (!response.ok) {
              const errorData = await response.json();
              throw new Error(`Fout bij het ophalen van data via de functie: ${errorData.error}`);
          }

          const data = await response.json();
          allSkis = data.records.map(record => record.fields);

          console.log('Alle data succesvol opgehaald via Netlify Function.', allSkis);

          const recommendedLength = userChoices.height - 15;
          if (recommendedLengthDisplay) {
              recommendedLengthDisplay.textContent = `De aanbevolen lengte voor jouw ski's is ${recommendedLength} cm`;
              recommendedLengthDisplay.classList.remove('hidden');
          }

          const normalizeAndCheck = (airtableValue, userChoice) => {
              const normalizedUserChoice = String(userChoice || '').toLowerCase().trim();
              const values = Array.isArray(airtableValue) ? airtableValue : [airtableValue];
              return values.some(val => String(val || '').toLowerCase().trim() === normalizedUserChoice);
          };

          const skisWithScore = allSkis.map(ski => {
              let score = 0;
              if (normalizeAndCheck(ski.Ability, userChoices.ability)) score++;
              if (normalizeAndCheck(ski.Piste, userChoices.piste)) score++;
              if (normalizeAndCheck(ski.Snelheid, userChoices.speed)) score++;
              if (normalizeAndCheck(ski.Bochten, userChoices.turns)) score++;

              if (userChoices.price) {
                  const [minPrice, maxPrice] = userChoices.price.split('-').map(Number);
                  const skiPrice = ski.Verkoopprijs;
                  if (skiPrice >= minPrice && skiPrice <= maxPrice) {
                      score++;
                  }
              }
              return { ...ski, relevanceScore: score };
          });

          skisWithScore.sort((a, b) => b.relevanceScore - a.relevanceScore);

          console.log('Gesorteerde ski\'s op relevantie:', skisWithScore);

          const skisToShow = skisWithScore
              .filter(ski => normalizeAndCheck(ski.Gender, userChoices.gender))
              .filter(ski => {
                  if (!userChoices.price) {
                      return true;
                  }
                  const [minPrice, maxPrice] = userChoices.price.split('-').map(Number);
                  const skiPrice = ski.Verkoopprijs;
                  return skiPrice <= maxPrice;
              })
              .slice(0, 3);

          const startColor = [245, 158, 11];
          const endColor = [16, 185, 129];

          if (skisToShow.length > 0) {
              skisToShow.forEach(ski => {
                  const matchPercentage = Math.round((ski.relevanceScore / 5) * 100);
                  const progressBarColor = interpolateColor(startColor, endColor, matchPercentage / 100);
                  const skiCard = `
                      <a href="${ski.Url || '#'}" target="_blank" class="result-card">
                          <div class="image-container">
                              ${ski['Url image'] ? 
                                  `<img src="${ski['Url image']}" alt="${ski.Artikelomschrijving || 'Ski afbeelding'}" class="ski-image">` : 
                                  `<div class="image-placeholder">
                                      <span class="image-placeholder-text">Geen afbeelding beschikbaar</span>
                                  </div>`}
                          </div>
                          <div class="details-container">
                              <div class="content-wrapper"><h3 class="heading-style-h3 is-small">${ski.Artikelomschrijving || 'N/A'}</h3></div>
                              <div class="match-container">
                                  <strong>Match:</strong>
                                  <div class="progress-bar">
                                      <div class="progress-bar-fill" style="width: ${matchPercentage}%; background-color: ${progressBarColor};"></div>
                                  </div>
                                  <span class="progress-percentage">${matchPercentage}%</span>
                              </div>
                              <p class="ski-detail"><strong>Merk:</strong> ${ski.Fabrikant || 'N/A'}</p>
                              <p class="ski-detail"><strong>Richtprijs:</strong> &euro;${Math.round(ski.Verkoopprijs) || 'N/A'}</p>
                          </div>
                      </a>
                  `;
                  if (resultsContainer) resultsContainer.innerHTML += skiCard;
              });
          } else {
              console.log('Geen matchende ski\'s gevonden.');
              if (noResultsMessage) noResultsMessage.classList.remove('hidden');
          }

      } catch (error) {
          console.error('Er is een fout opgetreden bij het ophalen van data via de Airtable API:', error);
          if (apiErrorMessage) {
              if (error.name === 'AbortError') {
                  apiErrorMessage.textContent = `De aanvraag is verlopen. Probeer het opnieuw met een betere netwerkverbinding.`;
              } else {
                  apiErrorMessage.textContent = `Er is een fout opgetreden bij het ophalen van data. Controleer je Airtable API-sleutel en je netwerkverbinding. Fout: ${error.message}`;
              }
              apiErrorMessage.classList.remove('hidden');
          }
      } finally {
          console.log('Zoekactie voltooid. Loader verbergen.');
          if (loaderOverlay) loaderOverlay.classList.add('hidden');
      }
  }
