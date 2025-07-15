/**
 * Main application functionality for Pokémon GO map
 */

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOMContentLoaded - JS działa!');
    // Initialize map
    const pokeMap = new PokeMap();
    pokeMap.initMap();
    
    // Load existing points
    loadPointsFromServer();
    
    // Set up form submission
    const pointForm = document.getElementById('point-form');
    pointForm.addEventListener('submit', (e) => {
        e.preventDefault();
        // Pobierz i sparsuj koordynaty
        const coordStr = document.getElementById('coordinates').value.trim();
        const match = coordStr.match(/^\s*(-?\d+(?:\.\d+)?)\s*,\s*(-?\d+(?:\.\d+)?)\s*$/);
        if (!match) {
            alert('Wklej poprawne koordynaty w formacie: 51.51660034800902, 17.268122925543906');
            return;
        }
        const latitude = parseFloat(match[1]);
        const longitude = parseFloat(match[2]);
        const pointType = document.getElementById('point-type').value;
        const pointName = document.getElementById('point-name').value;
        if (!isValidCoordinate(latitude, longitude)) {
            alert('Podaj poprawne wartości współrzędnych.');
            return;
        }
        const point = {
            type: pointType,
            name: pointName,
            lat: latitude,
            lng: longitude
        };
        pokeMap.addMarker(point);
        savePoint(point);
        pointForm.reset();
    });

    // Kliknięcie na mapie uzupełnia pole koordynatów
    pokeMap.map.on('click', (e) => {
        const lat = e.latlng.lat.toFixed(8);
        const lng = e.latlng.lng.toFixed(8);
        document.getElementById('coordinates').value = `${lat}, ${lng}`;
    });
    
    // Obsługa przycisku lokalizacji
    document.getElementById('locate-btn').addEventListener('click', () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude;
                    const lng = pos.coords.longitude;
                    pokeMap.map.setView([lat, lng], 16);
                    const marker = L.marker([lat, lng]).addTo(pokeMap.map);
                    marker.bindPopup('Twoja lokalizacja').openPopup();
                },
                (err) => {
                    alert('Nie udało się pobrać lokalizacji: ' + err.message);
                }
            );
        } else {
            alert('Twoja przeglądarka nie obsługuje geolokalizacji.');
        }
    });
    
    /**
     * Validate coordinates
     * @param {Number} lat - Latitude
     * @param {Number} lng - Longitude
     * @returns {Boolean} - Whether coordinates are valid
     */
    function isValidCoordinate(lat, lng) {
        return !isNaN(lat) && !isNaN(lng) && 
               lat >= -90 && lat <= 90 && 
               lng >= -180 && lng <= 180;
    }
    
    /**
     * Load points from server
     */
    function loadPointsFromServer() {
        db.collection("points").get().then(snapshot => {
            const points = [];
            snapshot.forEach(doc => {
                const data = doc.data();
                data._id = doc.id; // zapisz id dokumentu
                points.push(data);
            });
            pokeMap.loadPoints(points);
            // Wypełnij select punktów startowych po załadowaniu markerów
            if (typeof routeStartSelect !== 'undefined') {
                const allPoints = pokeMap.getMarkerData();
                routeStartSelect.innerHTML = allPoints.map((p, i) => `<option value="${i}">${p.name} (${p.type})</option>`).join('');
            }
        }).catch(error => {
            console.error('Error loading points:', error);
        });
    }

    // Obsługa usuwania punktu po otwarciu popupu
    pokeMap.map.on('popupopen', function(e) {
        const btn = e.popup._contentNode.querySelector('.delete-point-btn');
        if (btn) {
            btn.onclick = function() {
                const id = btn.getAttribute('data-id');
                if (confirm('Na pewno usunąć ten punkt?')) {
                    db.collection('points').doc(id).delete().then(() => {
                        loadPointsFromServer();
                    });
                }
            };
        }
    });
    
    /**
     * Save point to server
     * @param {Object} point - Point data
     */
    function savePoint(point) {
        db.collection("points").add(point)
            .then(() => {
                console.log("Point saved!");
            })
            .catch(error => {
                console.error("Error saving point:", error);
            });
    }

    // --- MODAL LOKALIZACJI UŻYTKOWNIKA ---
    const openLocateMapBtn = document.getElementById('open-locate-map-btn');
    const locateMapModal = document.getElementById('locate-map-modal');
    const closeLocateMapBtn = document.getElementById('close-locate-map-btn');
    const locateMapDiv = document.getElementById('locate-map');
    const userCoordsInput = document.getElementById('user-coords');
    const copyCoordsBtn = document.getElementById('copy-coords-btn');
    let locateMap = null;
    let locateMarker = null;

    openLocateMapBtn.addEventListener('click', () => {
        locateMapModal.style.display = 'flex';
        setTimeout(() => {
            if (!locateMap) {
                locateMap = L.map('locate-map').setView(pokeMap.map.getCenter(), 14);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; <a href=\"https://www.openstreetmap.org/copyright\">OpenStreetMap</a> contributors',
                    maxZoom: 19
                }).addTo(locateMap);
                locateMap.on('click', (e) => {
                    const lat = e.latlng.lat.toFixed(8);
                    const lng = e.latlng.lng.toFixed(8);
                    userCoordsInput.value = `${lat}, ${lng}`;
                    if (locateMarker) locateMap.removeLayer(locateMarker);
                    locateMarker = L.marker([lat, lng]).addTo(locateMap);
                });
            } else {
                locateMap.invalidateSize();
            }
        }, 100);
    });

    closeLocateMapBtn.addEventListener('click', () => {
        locateMapModal.style.display = 'none';
    });

    copyCoordsBtn.addEventListener('click', () => {
        userCoordsInput.select();
        document.execCommand('copy');
        copyCoordsBtn.textContent = 'Skopiowano!';
        setTimeout(() => {
            copyCoordsBtn.textContent = 'Kopiuj';
        }, 1200);
    });

    const locateMeBtn = document.getElementById('locate-me-btn');
    locateMeBtn.addEventListener('click', () => {
        if (navigator.geolocation) {
            locateMeBtn.textContent = 'Pobieranie...';
            navigator.geolocation.getCurrentPosition(
                (pos) => {
                    const lat = pos.coords.latitude.toFixed(8);
                    const lng = pos.coords.longitude.toFixed(8);
                    userCoordsInput.value = `${lat}, ${lng}`;
                    if (locateMarker) locateMap.removeLayer(locateMarker);
                    locateMarker = L.marker([lat, lng]).addTo(locateMap);
                    locateMap.setView([lat, lng], 16);
                    locateMeBtn.textContent = 'Moja pozycja';
                },
                (err) => {
                    alert('Nie udało się pobrać lokalizacji: ' + err.message);
                    locateMeBtn.textContent = 'Moja pozycja';
                }
            );
        } else {
            alert('Twoja przeglądarka nie obsługuje geolokalizacji.');
        }
    });

    const showPointsBtn = document.getElementById('show-points-btn');
    const pointsListDiv = document.getElementById('points-list');
    const pointsJsonActions = document.getElementById('points-json-actions');
    const downloadJsonBtn = document.getElementById('download-json-btn');
    const copyJsonBtn = document.getElementById('copy-json-btn');
    let pointsCache = [];

    showPointsBtn.addEventListener('click', () => {
        if (pointsListDiv.style.display === 'none') {
            db.collection("points").get().then(snapshot => {
                const points = [];
                snapshot.forEach(doc => {
                    const data = doc.data();
                    data._id = doc.id;
                    points.push(data);
                });
                pointsCache = points;
                if (points.length === 0) {
                    pointsListDiv.innerHTML = '<em>Brak punktów w bazie.</em>';
                } else {
                    pointsListDiv.innerHTML = '<ul style="list-style:none;padding:0;">' +
                        points.map(p => `<li style='margin-bottom:8px;'><b>${p.name}</b> (${p.type})<br><span style='font-size:90%;color:#555;'>${p.lat}, ${p.lng}</span></li>`).join('') +
                        '</ul>';
                }
                pointsListDiv.style.display = 'block';
                showPointsBtn.textContent = 'Ukryj listę punktów';
                pointsJsonActions.style.display = 'block';
            }).catch(() => {
                pointsListDiv.innerHTML = '<span style="color:red;">Błąd pobierania punktów.</span>';
                pointsListDiv.style.display = 'block';
                pointsJsonActions.style.display = 'none';
            });
        } else {
            pointsListDiv.style.display = 'none';
            showPointsBtn.textContent = 'Pokaż listę punktów';
            pointsJsonActions.style.display = 'none';
        }
    });

    downloadJsonBtn.addEventListener('click', () => {
        const jsonStr = JSON.stringify(pointsCache, null, 2);
        const blob = new Blob([jsonStr], {type: 'application/json'});
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'punkty.json';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 100);
    });

    copyJsonBtn.addEventListener('click', () => {
        const jsonStr = JSON.stringify(pointsCache, null, 2);
        if (navigator.clipboard) {
            navigator.clipboard.writeText(jsonStr).then(() => {
                copyJsonBtn.textContent = 'Skopiowano!';
                setTimeout(() => { copyJsonBtn.textContent = 'Kopiuj JSON'; }, 1200);
            });
        } else {
            // fallback
            const textarea = document.createElement('textarea');
            textarea.value = jsonStr;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            copyJsonBtn.textContent = 'Skopiowano!';
            setTimeout(() => { copyJsonBtn.textContent = 'Kopiuj JSON'; }, 1200);
        }
    });

    const downloadPdfBtn = document.getElementById('download-pdf-btn');
    downloadPdfBtn.addEventListener('click', () => {
        if (typeof window.leafletImage === 'undefined') {
            alert('Funkcja eksportu mapy do PDF wymaga biblioteki leaflet-image.');
            return;
        }
        // Ustaw widok na powiat milicki (środek i zoom)
        const miliczCenter = [51.5267, 17.2775];
        const miliczZoom = 12;
        pokeMap.map.setView(miliczCenter, miliczZoom);
        // Tymczasowo usuń markery
        const currentMarkers = pokeMap.markers.slice();
        pokeMap.clearMarkers();
        // Ustaw kreskówkową warstwę OSM Carto
        let cartoonLayer = L.tileLayer('https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap France',
            maxZoom: 20
        });
        pokeMap.map.eachLayer(layer => {
            if (layer instanceof L.TileLayer) {
                pokeMap.map.removeLayer(layer);
            }
        });
        cartoonLayer.addTo(pokeMap.map);
        setTimeout(() => {
            window.leafletImage(pokeMap.map, function(err, canvas) {
                // Przywróć domyślną warstwę mapy
                pokeMap.map.removeLayer(cartoonLayer);
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
                    attribution: '&copy; OpenStreetMap contributors',
                    maxZoom: 19
                }).addTo(pokeMap.map);
                // Przywróć markery
                currentMarkers.forEach(m => pokeMap.addMarker(m.data));
                if (err) {
                    alert('Błąd generowania obrazka mapy.');
                    return;
                }
                // Tworzenie PDF
                const imgData = canvas.toDataURL('image/png');
                const pdf = new window.jspdf.jsPDF({orientation: 'landscape', unit: 'px', format: [canvas.width, canvas.height]});
                pdf.addImage(imgData, 'PNG', 0, 0, canvas.width, canvas.height);
                pdf.save('mapa_milicz.pdf');
            });
        }, 2000);
    });

    // --- PLANOWANIE TRASY ---
    const routePlannerForm = document.getElementById('route-planner-form');
    const routeModal = document.getElementById('route-modal');
    const closeRouteModalBtn = document.getElementById('close-route-modal-btn');
    const routeMapPreviewDiv = document.getElementById('route-map-preview');
    const routeLegendDiv = document.getElementById('route-legend');
    const openGmapsLink = document.getElementById('open-gmaps-link');
    const routeStartSelect = document.getElementById('route-start');
    const routeDescriptionDiv = document.getElementById('route-description');
    const routeFocusSelect = document.getElementById('route-focus');
    const routeLengthInput = document.getElementById('route-length');
    const routeChallengesDiv = document.getElementById('route-challenges');
    let routeMap = null;
    let routePolyline = null;
    let routePoints = [];

    // Wypełnij select punktów startowych po załadowaniu mapy
    setTimeout(() => {
        const allPoints = pokeMap.getMarkerData();
        routeStartSelect.innerHTML = allPoints.map((p, i) => `<option value="${i}">${p.name} (${p.type})</option>`).join('');
    }, 1000);

    // Lista zadań do urozmaicenia rozgrywki
    const CHALLENGES = [
        // Zadania związane z łapaniem Pokémonów
        'Złap 5 Pokémonów tego samego typu pod rząd.',
        'Złap 3 Pokémony o CP powyżej 1000.',
        'Złap Pokémona, którego jeszcze nie masz w Pokédexie.',
        'Złap Pokémona z użyciem tylko Poké Balli.',
        'Złap 10 Pokémonów z wykorzystaniem Excellent Throw.',
        'Złap Pokémona rzadkiego w twojej okolicy.',
        'Złap Pokémona, używając tylko jednej ręki (ostrożnie!).',
        'Złap 3 Pokémonów podczas spaceru przez park.',
        'Złap 5 Pokémonów z wykorzystaniem Curveball.',
        'Złap Pokémona zaraz po włączeniu gry.',
        'Złap Pokémona z pogodą, która wzmacnia dany typ.',
        'Złap 5 Pokémonów, które ewoluują za pomocą przedmiotu.',
        'Złap Pokémona, który uciekał ci już wcześniej.',
        'Złap 15 Pokémonów różnego typu.',
        'Złap Pokémona z CP poniżej 10.',
        // Zadania związane z eksploracją i ruchem
        'Przejdź 1 km z włączonym Adventure Sync.',
        'Odwiedź 5 różnych PokéStopów w ciągu 15 minut.',
        'Zakręć 10 różnymi PokéStopami.',
        'Zrób zdjęcie Pokémonowi w trybie AR w ciekawym miejscu.',
        'Odwiedź Gym, którego nigdy wcześniej nie widziałeś.',
        'Przejdź 2 km, nie używając samochodu ani roweru.',
        'Odwiedź PokéStop z unikalną historyczną tablicą.',
        'Znajdź 3 różne Pokémony na tej samej ulicy.',
        'Aktywuj 10 różnych PokéStopów pod rząd.',
        'Wykluj jajko 2 km.',
        'Wykluj jajko 5 km.',
        'Wykluj jajko 7 km (z prezentu od znajomego).',
        'Wykluj jajko 10 km.',
        'Wykluj jajko z wydarzenia specjalnego.',
        'Zrób 3 zdjęcia różnym Pokémonom w trybie AR.',
        // Zadania związane z Gymami i Raidami
        'Wygraj Raid 1-gwiazdkowy.',
        'Dodaj Pokémona do Gymu.',
        'Zdobądź 10 monet z Gymu.',
        'Pokonaj 3 Pokémony w Gymie.',
        'Wygraj Raid z przyjacielem.',
        'Użyj ataku Charge Attack 5 razy w Gymie.',
        'Uzdrów 5 Pokémonów po walce w Gymie.',
        'Wejdź do Gymu i trzymaj go przez co najmniej 1 godzinę.',
        'Weź udział w Raidzie w nowym miejscu.',
        'Zdobądź Raid Pass ze spinningu Gymu.',
        // Zadania związane z przyjaciółmi i wymianą
        'Wyślij prezent 3 różnym znajomym.',
        'Otwórz 5 prezentów od znajomych.',
        'Wymień się Pokémonem z przyjacielem.',
        'Zdobądź serduszko ze swoim Buddy Pokémonem.',
        'Osiągnij poziom Good Friend z nowym znajomym.',
        'Zrób zdjęcie swojemu Buddy Pokémonowi.',
        'Zagraj ze swoim Buddy Pokémonem.',
        'Podaruj swojemu Buddy Pokémonowi 3 jagody.',
        'Zrób zdjęcie swojemu Buddy Pokémonowi w trybie AR.',
        'Wymień się Pokémonem, który ma wysoką IV (co najmniej 3 gwiazdki).',
        // Zadania związane z ewolucją i przedmiotami
        'Ewoluuj Pokémona, który wymaga przedmiotu.',
        'Ewoluuj Pokémona z wykorzystaniem Lucky Egg.',
        'Użyj Star Piece.',
        'Użyj Incense.',
        'Użyj Lure Module w PokéStopie.',
        'Ewoluuj Pokémona, którego jeszcze nie masz w Pokédexie.',
        'Wzmocnij Pokémona 3 razy.',
        'Użyj TM Fast Attack.',
        'Użyj TM Charged Attack.',
        'Użyj Elite TM (jeśli masz).',
        'Zdobądź 25 Candy z Pokémona poprzez chodzenie.',
        'Zdobądź 50 Candy z Pokémona.',
        'Użyj Rare Candy na Pokémonie.',
        'Złap Pokémona, który daje dodatkowe Candy (np. z Mega Ewolucji).',
        'Przenieś 10 Pokémonów do Profesora.',
        // Zadania związane z Photo Bombami i Snapshotami
        'Zrób zdjęcie Pokémonowi w trybie AR i złap Photo Bomb.',
        'Zrób 5 zdjęć różnym Pokémonom.',
        'Zrób zdjęcie Legendarnemu Pokémonowi (jeśli masz dostęp).',
        'Zrób zdjęcie swojemu Buddy Pokémonowi, gdy jest na mapie.',
        'Zrób zdjęcie swojemu Pokémonowi siedzącemu na twojej kanapie.',
        // Zadania różnorodne i codzienne
        'Aktywuj codziennego Daily Incense.',
        'Ukończ 3 zadania polowe.',
        'Ukończ zadanie specjalne.',
        'Zdobądź 10 000 Stardustu.',
        'Zdobądź 50 000 XP.',
        'Zmień ubranie swojego awatara.',
        'Zmień pozę swojego awatara.',
        'Zmień swoją nazwę Buddy Pokémona.',
        'Sprawdź swoje Medale i znajdź ten, który jest najbliżej ulepszenia.',
        'Oznacz Pokémona jako ulubionego.',
        'Zrób zrzut ekranu swojego Pokédexa.',
        'Zagraj w Pokémon GO w deszczu (ostrożnie!).',
        'Zagraj w Pokémon GO w słoneczny dzień.',
        'Sprawdź swoją odległość w Adventure Sync.',
        'Sprawdź swój dziennik.',
        // Zadania na wyższym poziomie
        'Złap Shiny Pokémona.',
        'Ewoluuj Shiny Pokémona.',
        'Zdobądź Pokémona 100% IV.',
        'Pokonaj Lidera Zespołu GO Rocket.',
        'Pokonaj Giovanniego.',
        'Oczyść Shadow Pokémona.',
        'Zdobądź Mega Ewolucję dla Pokémona.',
        'Weź udział w Raidzie Mega.',
        'Zrób zdjęcie Pokémonowi w trybie AR w bardzo nietypowym miejscu.',
        'Osiągnij poziom Ultra Friend z przyjacielem.',
        'Osiągnij poziom Best Friend z przyjacielem.',
        'Użyj Super Rocket Radar.',
        'Złap Pokémona legendarnego w Raidzie.',
        'Użyj Star Piece podczas wydarzenia z podwójnym Stardustem.',
        'Zrób 10 Excellent Throws pod rząd.'
    ];

    routePlannerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const allPoints = pokeMap.getMarkerData();
        const startIdx = parseInt(routeStartSelect.value);
        const focus = routeFocusSelect.value;
        const maxLength = parseFloat(routeLengthInput.value);
        if (isNaN(startIdx) || !allPoints[startIdx]) {
            alert('Wybierz punkt startowy!');
            return;
        }
        let used = [allPoints[startIdx]];
        let available = allPoints.filter((_, i) => i !== startIdx);
        let totalDist = 0;
        const NEAR_DIST = 200; // metry
        while (available.length > 0) {
            const last = used[used.length - 1];
            let candidates;
            if (focus === 'pokestop') {
                candidates = available.filter(p => p.type === 'PokéStop' || p.type === 'Gym');
            } else {
                // Preferuj Gymy, ale PokéStopy jeśli są blisko Gymów na trasie
                const gyms = available.filter(p => p.type === 'Gym');
                if (gyms.length > 0) {
                    // Najbliższy Gym
                    const nextGym = gyms.sort((a, b) => distance(last, a) - distance(last, b))[0];
                    // PokéStopy blisko tego Gyma
                    const closeStops = available.filter(p => p.type === 'PokéStop' && distance(nextGym, p) < NEAR_DIST);
                    candidates = [nextGym, ...closeStops];
                } else {
                    candidates = available;
                }
            }
            // Usuń undefined (może się zdarzyć jeśli nie ma Gymów)
            candidates = candidates.filter(Boolean);
            if (candidates.length === 0) candidates = available;
            const next = candidates.sort((a, b) => distance(last, a) - distance(last, b))[0];
            const d = distance(last, next);
            if (totalDist + d > maxLength * 1000) break;
            used.push(next);
            available = available.filter(p => p !== next);
            totalDist += d;
        }
        routePoints = used;
        showRouteModal();
    });

    function distance(a, b) {
        // Haversine
        const R = 6371e3;
        const toRad = x => x * Math.PI / 180;
        const dLat = toRad(b.lat - a.lat);
        const dLng = toRad(b.lng - a.lng);
        const lat1 = toRad(a.lat);
        const lat2 = toRad(b.lat);
        const aVal = Math.sin(dLat/2) * Math.sin(dLat/2) + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng/2) * Math.sin(dLng/2);
        const c = 2 * Math.atan2(Math.sqrt(aVal), Math.sqrt(1-aVal));
        return R * c;
    }

    async function getWalkingDistance(a, b) {
        // OSRM public API (lub lokalny serwer)
        const url = `https://router.project-osrm.org/route/v1/foot/${a.lng},${a.lat};${b.lng},${b.lat}?overview=false`;
        try {
            const res = await fetch(url);
            const data = await res.json();
            if (data.routes && data.routes[0]) {
                return data.routes[0].distance;
            }
        } catch (e) {}
        // fallback: linia prosta
        return distance(a, b);
    }

    function showRouteModal() {
        routeModal.style.display = 'flex';
        const pokestopCount = routePoints.filter(p => p.type === 'PokéStop').length;
        const gymCount = routePoints.filter(p => p.type === 'Gym').length;
        const totalKm = (routePoints.reduce((acc, cur, i, arr) => i > 0 ? acc + distance(arr[i-1], cur) : 0, 0) / 1000).toFixed(2);
        const firstPoint = routePoints[0];
        const lastPoint = routePoints[routePoints.length - 1];
        // Nazwy punktów na trasie
        const stopsNames = routePoints.filter(p => p.type === 'PokéStop').map(p => p.name);
        const gymsNames = routePoints.filter(p => p.type === 'Gym').map(p => p.name);
        // Losowe warianty wstępu
        const intros = [
            `Twoja przygoda zaczyna się przy <b>${firstPoint.name}</b> i kończy przy <b>${lastPoint.name}</b>.`,
            `Wyrusz z <b>${firstPoint.name}</b> i odkryj trasę pełną niespodzianek!`,
            `Startujesz przy <b>${firstPoint.name}</b> – gotowy na wyzwania?`,
            `Rozpocznij trasę od <b>${firstPoint.name}</b> i sprawdź, co czeka po drodze!`
        ];
        // Losowe podsumowanie
        const outros = [
            `Cała trasa ma <b>${totalKm} km</b> i prowadzi przez ${routePoints.length} punktów.`,
            `Przed Tobą <b>${totalKm} km</b> spaceru i mnóstwo okazji do łapania, kręcenia i walk!`,
            `Pokonasz <b>${totalKm} km</b> i odwiedzisz ${routePoints.length} miejsc – powodzenia!`,
            `To będzie świetna przygoda na dystansie <b>${totalKm} km</b>!`
        ];
        // Opis główny
        let mainDesc = '';
        if (pokestopCount > 0 && gymCount > 0) {
            mainDesc = `Na trasie znajdziesz <b>${pokestopCount} PokéStopów</b> (${stopsNames.slice(0,3).join(', ')}${stopsNames.length>3?', ...':''}) oraz <b>${gymCount} Gymów</b> (${gymsNames.slice(0,2).join(', ')}${gymsNames.length>2?', ...':''}). To idealna trasa na zbieranie przedmiotów i udział w raidach!`;
        } else if (pokestopCount > 0 && gymCount === 0) {
            mainDesc = `Trasa prowadzi przez <b>${pokestopCount} PokéStopów</b> (${stopsNames.slice(0,5).join(', ')}${stopsNames.length>5?', ...':''}). Świetna okazja na uzupełnienie zapasów i odkrywanie ciekawych miejsc!`;
        } else if (gymCount > 0 && pokestopCount === 0) {
            mainDesc = `Czeka Cię wyzwanie na <b>${gymCount} Gymach</b> (${gymsNames.slice(0,5).join(', ')}${gymsNames.length>5?', ...':''}). Przygotuj się na walki i raidowanie!`;
        } else {
            mainDesc = 'Na tej trasie nie ma PokéStopów ani Gymów – może czas dodać nowe punkty na mapie?';
        }
        // Losowy wstęp i zakończenie
        const intro = intros[Math.floor(Math.random()*intros.length)];
        const outro = outros[Math.floor(Math.random()*outros.length)];
        // Motywujące hasło
        const slogans = [
            'Niech szczęście i dobry drop będą z Tobą! ✨',
            'Pamiętaj o powerbanku i wodzie! 💧',
            'Złap je wszystkie i baw się dobrze! 🕹️',
            'Nie zapomnij o codziennych zadaniach! 📋',
            'Czas na przygodę – GO!',
            'Może trafisz na Shiny? ✨',
            'Niech Twój Buddy będzie z Ciebie dumny! 🐾',
            'Pamiętaj o bezpieczeństwie na trasie! 🚦'
        ];
        const slogan = slogans[Math.floor(Math.random()*slogans.length)];
        routeDescriptionDiv.innerHTML = `<b>Opis trasy:</b><br>${intro}<br>${mainDesc}<br>${outro}<br><br><i>${slogan}</i><br><br><b>Punkty na trasie:</b><br>` +
            routePoints.map((p, i) => `${i+1}. ${p.name} (${p.type})`).join('<br>');
        openGmapsLink.href = generateGoogleMapsDirLink(routePoints);
        // Losuj 2 zadania z pełnej puli ALL_TASKS
        const shuffled = ALL_TASKS.slice().sort(() => Math.random() - 0.5);
        currentRouteTasks = shuffled.slice(0, 2).map(t => ({...t, done: false}));
        routeChallengesDiv.innerHTML = `<b>🎯 Twoje wyzwania na dziś:</b><br><span style='color:#3558A0;'>Podejmij te zadania podczas swojej przygody i baw się jeszcze lepiej!</span><ul style='margin-top:8px; font-size:1.08em;'>` +
            currentRouteTasks.map(t => `<li><span class='task-dot task-${t.level}-dot'></span>${t.text}</li>`).join('') + '</ul>';
    }

    function generateGoogleMapsDirLink(points) {
        const base = 'https://www.google.com/maps/dir/';
        const path = points.map(p => `${p.lat},${p.lng}`).join('/');
        return base + path;
    }

    closeRouteModalBtn.addEventListener('click', () => {
        routeModal.style.display = 'none';
        if (routeMap && routePolyline) routeMap.removeLayer(routePolyline);
    });

    // --- Zadania Pokémon GO ---
    const easyTasks = [
      "Złap 10 Pokémonów",
      "Obróć 5 PokéStopów",
      "Wylęgnij 1 jajko",
      "Przejdź 1 km",
      "Zrób 3 świetne rzuty",
      "Zrób zdjęcie swojego buddy",
      "Daj buddy’emu przekąskę",
      "Ulepsz 3 Pokémony",
      "Złap 5 różnych typów Pokémonów",
      "Złap 3 Pokémony typu wodnego",
      "Użyj 1 Incense",
      "Zrób 3 rzuty typu Nice",
      "Wykonaj 1 rajd (Tier 1 lub 3)",
      "Złap 3 Pokémony z pogodowym boostem",
      "Prześlij 3 Pokémony do Profesora",
      "Wymień 1 Pokémon z kolegą",
      "Użyj 5 Pinap Berries",
      "Użyj 5 Razz Berries",
      "Zrób 5 snapshotów dzikich Pokémonów",
      "Zrób 5 snapshotów buddy’ego",
      "Przeglądnij 1 stronę kolekcji medalów",
      "Wymień Pokémony z IV powyżej 80%",
      "Ukończ 3 zadania Field Research",
      "Złap 5 Pokémonów przy pomocy GO Plus",
      "Złap Pokémony przy pomocy Quick Catch",
      "Zrób 1 upgrade PokéStopu (jeśli masz funkcję)",
      "Złap 3 Pokémony z Team GO Rocket",
      "Pokonaj 1 Grunt z Team GO Rocket",
      "Przeglądnij 5 stron Pokedexu",
      "Otwórz 1 Gift",
      "Wyślij 3 prezenty do znajomych",
      "Dodaj 1 nowego znajomego",
      "Przeglądnij sklep i zrób zrzut ekranu",
      "Zrób 1 ewolucję",
      "Oznacz 1 Pokémon jako ulubiony",
      "Sprawdź statystyki swojego buddy’ego",
      "Przejdź z buddy’m 1 serce",
      "Zrób zdjęcie z AR",
      "Zmień nazwę jednego Pokémona",
      "Sprawdź jednego Pokémona w PvP IV Checkerze"
    ];
    const mediumTasks = [
      "Złap 50 Pokémonów",
      "Przejdź 5 km",
      "Zrób 10 świetnych rzutów",
      "Złap 10 Pokémonów typu elektrycznego",
      "Weź udział w 3 rajdach",
      "Zdobądź 10 Candy ze swoim buddy",
      "Ewoluuj 5 Pokémonów",
      "Złap 3 Pokémony typu duch lub mroczny",
      "Pokonaj 3 Gruntów z Team GO Rocket",
      "Pokonaj 1 lidera (Sierra, Cliff, Arlo)",
      "Wykluj 3 jajka",
      "Prześlij 20 Pokémonów",
      "Złap 10 Pokémonów z boostem pogodowym",
      "Zrób 3 rzuty Excellent",
      "Wykonaj 5 zadań Field Research",
      "Wyślij 10 prezentów",
      "Weź udział w bitwie PvP (Great League)",
      "Wygraj 1 bitwę w GO Battle League",
      "Użyj 1 Lucky Egg",
      "Zrób 5 snapshotów dzikich Pokémonów różnych typów",
      "Ulepsz Pokémona 10 razy",
      "Zdobyj 50 pokécoins (z gymów)",
      "Odwiedź 10 PokéStopów",
      "Odwiedź 3 nowe PokéStopy",
      "Ulepsz Gym do poziomu złotego (jeśli blisko końca)",
      "Zdobądź 20 serc z buddy",
      "Wylęgnij jajko 10 km",
      "Zrób 20 rzuty typu Nice",
      "Użyj 10 berry na dzikich Pokémonach",
      "Wymień 5 Pokémonów z kolegą",
      "Znajdź 1 shiny Pokémon",
      "Zdobądź 3 nowe wpisy do Pokédexu",
      "Zrób 1 Mega Evolucję",
      "Zrób zdjęcie z buddy na PokéStopie",
      "Weź udział w 1 rajdzie zdalnym",
      "Wymień Pokémona za 100 stardustu (special trade)",
      "Zdobądź 3 snapshoty z photobombą",
      "Zrób 3 Power-Up Pokémonów do maksymalnego CP",
      "Zdobądź 1 nową odznakę (medal)",
      "Weź udział w 1 event challenge’u (np. research day)"
    ];
    const hardTasks = [
      "Złap 200 Pokémonów",
      "Przejdź 10 km",
      "Wygraj 5 bitew PvP",
      "Ukończ 10 rajdów",
      "Zrób 10 rzutów Excellent",
      "Zdobądź 50 serc z buddy",
      "Wylęgnij 5 jajek",
      "Zdobądź 100 Candy ze swoim buddy",
      "Zrób 50 zdjęć Pokémonów różnych typów",
      "Wymień 10 Pokémonów z różnymi znajomymi",
      "Złap 20 Pokémonów typu walczącego",
      "Zrób 3 specjalne wymiany (special trades)",
      "Złap 10 Pokémonów z incensa",
      "Zdobądź 5 snapshotów z fotobombą (Smeargle)",
      "Ulepsz 5 Pokémonów do max CP",
      "Pokonaj 6 Gruntów i 3 liderów",
      "Zdobądź 100.000 stardustu w 1 dzień",
      "Zrób 20 ewolucji różnych Pokémonów",
      "Zdobądź 1 Lucky Pokémona z wymiany",
      "Znajdź 2 shiny Pokémony jednego dnia"
    ];
    const ALL_TASKS = [
      ...easyTasks.map(t => ({text: t, level: 'easy'})),
      ...mediumTasks.map(t => ({text: t, level: 'medium'})),
      ...hardTasks.map(t => ({text: t, level: 'hard'})),
    ];
    const motivationalQuotes = [
      "Każdy krok przybliża Cię do celu!",
      "Nie poddawaj się, trenerze!",
      "Najlepsze dopiero przed Tobą!",
      "Złap je wszystkie!",
      "Twoja przygoda właśnie się zaczyna!",
      "Jesteś bliżej niż myślisz!",
      "Każdy dzień to nowa szansa!"
    ];

    function drawTasks() {
      // Losuj 1 łatwe, 1 średnie, 1 trudne
      const easy = easyTasks[Math.floor(Math.random() * easyTasks.length)];
      const medium = mediumTasks[Math.floor(Math.random() * mediumTasks.length)];
      const hard = hardTasks[Math.floor(Math.random() * hardTasks.length)];
      return [
        { text: easy, level: "easy", done: false },
        { text: medium, level: "medium", done: false },
        { text: hard, level: "hard", done: false }
      ];
    }

    function saveTasks(tasks) {
      localStorage.setItem('pokeTasks', JSON.stringify(tasks));
    }
    function loadTasks() {
      return JSON.parse(localStorage.getItem('pokeTasks')) || [];
    }

    function getReward(tasks) {
      const hard = tasks.filter(t => t.level === "hard").length;
      const medium = tasks.filter(t => t.level === "medium").length;
      if (hard >= 1) return "Nagroda: możesz kupić sobie 100 PokéCoinów!";
      if (medium >= 2) return "Nagroda: możesz kupić sobie słodycza!";
      if (medium === 1) return "Nagroda: możesz kupić sobie lizaka!";
      return "Motywacja: " + motivationalQuotes[Math.floor(Math.random() * motivationalQuotes.length)];
    }

    // --- Zestawy zadań ---
    function saveTaskSet(name, tasks) {
      const sets = loadTaskSets();
      sets[name] = tasks;
      localStorage.setItem('pokeTaskSets', JSON.stringify(sets));
    }
    function loadTaskSets() {
      return JSON.parse(localStorage.getItem('pokeTaskSets')) || {};
    }
    function deleteTaskSet(name) {
      const sets = loadTaskSets();
      delete sets[name];
      localStorage.setItem('pokeTaskSets', JSON.stringify(sets));
    }

    // --- Modal z zadaniami ---
    function renderTasksModal() {
      const sets = loadTaskSets();
      const tasksetSelect = document.getElementById('taskset-select');
      const tasks = selectedTaskSetName && sets[selectedTaskSetName] ? sets[selectedTaskSetName] : [];
      const list = document.getElementById('tasksList');
      list.innerHTML = '';
      tasks.forEach((task, idx) => {
        const li = document.createElement('li');
        li.className = task.done ? 'completed' : '';
        li.innerHTML = `<label><input type='checkbox' data-idx='${idx}' ${task.done ? 'checked' : ''}/> <span class='task-dot task-${task.level}-dot'></span>${task.text}</label>`;
        list.appendChild(li);
      });
      // Nagroda po wykonaniu wszystkich
      const rewardDiv = document.getElementById('reward');
      if (tasks.length && tasks.every(t => t.done)) {
        rewardDiv.textContent = getReward(tasks);
      } else {
        rewardDiv.textContent = '';
      }
    }

    // --- Modal zadań: wybór zestawu, usuwanie, odznaczanie ---
    const tasksetSelect = document.getElementById('taskset-select');
    const deleteTasksetBtn = document.getElementById('delete-taskset-btn');
    let selectedTaskSetName = null;

    function renderTaskSetSelect() {
      const sets = loadTaskSets();
      tasksetSelect.innerHTML = '';
      const names = Object.keys(sets);
      if (names.length === 0) {
        tasksetSelect.innerHTML = '<option value="">Brak zapisanych zestawów</option>';
        selectedTaskSetName = null;
        renderTasksModal();
        return;
      }
      names.forEach((name, i) => {
        const opt = document.createElement('option');
        opt.value = name;
        opt.textContent = name;
        tasksetSelect.appendChild(opt);
      });
      // Domyślnie wybierz pierwszy
      if (!selectedTaskSetName || !sets[selectedTaskSetName]) {
        selectedTaskSetName = names[0];
      }
      tasksetSelect.value = selectedTaskSetName;
      renderTasksModal();
    }

    if (tasksetSelect) {
      tasksetSelect.addEventListener('change', () => {
        selectedTaskSetName = tasksetSelect.value;
        renderTasksModal();
      });
    }
    if (deleteTasksetBtn) {
      deleteTasksetBtn.addEventListener('click', () => {
        if (selectedTaskSetName && confirm('Usunąć zestaw zadań?')) {
          deleteTaskSet(selectedTaskSetName);
          selectedTaskSetName = null;
          renderTaskSetSelect();
        }
      });
    }

    // Obsługa odznaczania wykonania zadania
    const tasksList = document.getElementById('tasksList');
    if (tasksList) {
      tasksList.addEventListener('change', (e) => {
        if (e.target.type === 'checkbox') {
          const idx = e.target.getAttribute('data-idx');
          const sets = loadTaskSets();
          if (selectedTaskSetName && sets[selectedTaskSetName]) {
            sets[selectedTaskSetName][idx].done = e.target.checked;
            localStorage.setItem('pokeTaskSets', JSON.stringify(sets));
            renderTasksModal();
          }
        }
      });
    }

    // Otwieranie modala zadań: odśwież select
    const openTasksBtn = document.getElementById('openTasksBtn');
    const tasksModal = document.getElementById('tasksModal');
    const closeTasksModal = document.getElementById('closeTasksModal');
    if (openTasksBtn) {
      openTasksBtn.addEventListener('click', () => {
        renderTaskSetSelect();
        tasksModal.style.display = 'block';
      });
    }
    if (closeTasksModal) {
      closeTasksModal.addEventListener('click', () => {
        tasksModal.style.display = 'none';
      });
    }

    // --- ZAPISYWANIE ZADAŃ Z TRASY ---
    const saveRouteTasksBtn = document.getElementById('save-route-tasks-btn');
    const routeTasksNameInput = document.getElementById('route-tasks-name');
    const saveRouteTasksMsg = document.getElementById('save-route-tasks-msg');
    if (saveRouteTasksBtn) {
      saveRouteTasksBtn.addEventListener('click', () => {
        const name = routeTasksNameInput.value.trim();
        if (!name) {
          saveRouteTasksMsg.textContent = 'Podaj nazwę!';
          return;
        }
        if (!currentRouteTasks.length) {
          saveRouteTasksMsg.textContent = 'Brak zadań do zapisania!';
          return;
        }
        saveTaskSet(name, currentRouteTasks);
        saveRouteTasksMsg.textContent = 'Zapisano!';
        setTimeout(() => { saveRouteTasksMsg.textContent = ''; }, 1500);
        // Od razu odśwież select w modalu zadań jeśli otwarty
        renderTaskSetSelect();
      });
    }
});