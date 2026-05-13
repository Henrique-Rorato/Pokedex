// ===========================
// CONFIGURAÇÕES GLOBAIS
// ===========================

const API_BASE = 'https://pokeapi.co/api/v2';
const TCG_API_BASE = 'https://api.pokemontcg.io/v2';
const TCG_API_KEY = ''; // opcional: defina sua chave da Pokémon TCG API aqui
const POKEMON_PER_PAGE = 50;

// ===========================
// ESTADO DA APLICAÇÃO
// ===========================

const state = {
    allPokemon: [],
    filteredPokemon: [],
    currentPage: 0,
    selectedType: '',
    searchQuery: '',
    isDarkMode: localStorage.getItem('darkMode') === 'true'
};

// ===========================
// ELEMENTOS DO DOM
// ===========================

const pokemonGrid = document.getElementById('pokemonGrid');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const typeFilter = document.getElementById('typeFilter');
const themeToggle = document.getElementById('themeToggle');
const detailModal = document.getElementById('detailModal');
const closeBtn = document.getElementById('closeBtn');
const modalBody = document.getElementById('modalBody');

// ===========================
// FUNÇÕES UTILITÁRIAS
// ===========================

/**
 * Busca Pokémon da API
 */
async function fetchPokemonList() {
    try {
        pokemonGrid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i><p>Carregando Pokémon...</p></div>';
        
        const response = await fetch(`${API_BASE}/pokemon?limit=1025&offset=0`);
        const data = await response.json();
        
        const pokemonDetails = [];
        const batchSize = 50;

        for (let i = 0; i < data.results.length; i += batchSize) {
            const batch = data.results.slice(i, i + batchSize);
            const fetchedBatch = await Promise.all(
                batch.map(pokemon => fetch(pokemon.url).then(res => res.json()))
            );
            pokemonDetails.push(...fetchedBatch);
            state.allPokemon = pokemonDetails;
            state.filteredPokemon = pokemonDetails;
            displayPokemon();
        }
        
        state.allPokemon = pokemonDetails;
        state.filteredPokemon = pokemonDetails;
        displayPokemon();
    } catch (error) {
        console.error('Erro ao buscar Pokémon:', error);
        pokemonGrid.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Erro ao carregar Pokémon</p></div>';
    }
}

/**
 * Extrai o ID do Pokémon a partir da URL de detalhe
 */

/**
 * Busca até duas cartas TCG do Pokémon se disponíveis
 */
async function fetchPokemonTcgCards(pokemonName) {
    try {
        const url = `${TCG_API_BASE}/cards?q=name:"${pokemonName}"&pageSize=4`;
        const headers = TCG_API_KEY ? { 'X-Api-Key': TCG_API_KEY } : {};
        const response = await fetch(url, { headers });
        if (!response.ok) return [];

        const data = await response.json();
        return (data.data || [])
            .filter(card => card.images && card.images.large)
            .slice(0, 2)
            .map(card => ({
                image: card.images.large,
                title: card.name
            }));
    } catch (error) {
        console.warn('Não foi possível buscar as cartas TCG:', error);
        return [];
    }
}

/**
 * Exibe os Pokémon na grade
 */
function displayPokemon() {
    if (state.filteredPokemon.length === 0) {
        pokemonGrid.innerHTML = '<div class="empty-state"><i class="fas fa-search"></i><p>Nenhum Pokémon encontrado</p></div>';
        return;
    }

    pokemonGrid.innerHTML = state.filteredPokemon.map(pokemon => {
        const favoriteIcon = pokemon.name.toLowerCase() === 'marshadow' ? '<i class="fas fa-heart favorite-icon" title="Melhor Pokémon"></i>' : '';
        const cardClass = pokemon.name.toLowerCase() === 'marshadow' ? 'pokemon-card marshadow-card' : 'pokemon-card';
        const imageContent = `<img src="${pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}" alt="${pokemon.name}" class="pokemon-image">`;
        const typeBadges = pokemon.types.map(type => `<span class="type-badge type-${type.type.name}">${type.type.name}</span>`).join('');

        return `
        <div class="${cardClass}" onclick="showPokemonDetail(${pokemon.id})">
            <div class="pokemon-id">#${String(pokemon.id).padStart(4, '0')}</div>
            ${imageContent}
            <div class="pokemon-name">${pokemon.name} ${favoriteIcon}</div>
            <div class="pokemon-types">${typeBadges}</div>
        </div>
    `;
    }).join('');

}

/**
 * Filtra Pokémon por tipo e busca
 */
function filterPokemon() {
    state.filteredPokemon = state.allPokemon.filter(pokemon => {
        const query = state.searchQuery.toLowerCase();
        const isIdSearch = query.startsWith('#');
        const cleanQuery = isIdSearch ? query.slice(1) : query;
        const paddedId = String(pokemon.id).padStart(4, '0');
        const matchesSearch = isIdSearch ? pokemon.id == parseInt(cleanQuery) : (pokemon.name.toLowerCase().includes(cleanQuery) || paddedId.includes(cleanQuery));
        
        const matchesType = state.selectedType === '' || 
                          pokemon.types.some(type => type.type.name === state.selectedType);
        
        return matchesSearch && matchesType;
    });

    displayPokemon();
}

/**
 * Mostra detalhes do Pokémon no modal
 */
async function showPokemonDetail(pokemonId) {
    const detail = state.allPokemon.find(p => p.id === pokemonId);
    
    if (!detail) return;

    const stats = detail.stats.map(stat => ({
        name: stat.stat.name,
        value: stat.base_stat,
        maxValue: 255
    }));

    const abilities = detail.abilities.map(ability => ability.ability.name).join(', ');

    const favoriteIcon = detail.name.toLowerCase() === 'marshadow' ? '<i class="fas fa-heart favorite-icon" title="Melhor Pokémon"></i>' : '';
    const hp = stats.find(stat => stat.name === 'hp')?.value || 0;
    const tcgCards = await fetchPokemonTcgCards(detail.name);
    const defaultImage = detail.sprites.other['official-artwork'].front_default || detail.sprites.front_default;
    const cardImages = [
        tcgCards[0] || { image: defaultImage, title: 'Carta oficial' },
        tcgCards[1] || tcgCards[0] || { image: defaultImage, title: 'Carta EX/GX' }
    ];
    modalBody.innerHTML = `
        <div class="pokemon-detail-header">
            <img src="${detail.sprites.other['official-artwork'].front_default || detail.sprites.front_default}" 
                 alt="${detail.name}" 
                 class="pokemon-detail-image">
            <div class="pokemon-detail-name">${detail.name} ${favoriteIcon}</div>
            <div class="pokemon-id">#${String(detail.id).padStart(4, '0')}</div>
            <div class="pokemon-types">
                ${detail.types.map(type => `<span class="type-badge type-${type.type.name}">${type.type.name}</span>`).join('')}
            </div>
        </div>

        <div style="margin: 1.5rem 0;">
            <h3 style="margin-bottom: 0.5rem;">Informações</h3>
            <p><strong>Altura:</strong> ${(detail.height / 10).toFixed(1)} m</p>
            <p><strong>Peso:</strong> ${(detail.weight / 10).toFixed(1)} kg</p>
            <p><strong>Habilidades:</strong> ${abilities}</p>
        </div>

        <div>
            <h3 style="margin-bottom: 1rem;">Estatísticas</h3>
            <div class="pokemon-stats">
                ${stats.map(stat => `
                    <div class="stat">
                        <div class="stat-name">${stat.name.replace('-', ' ')}</div>
                        <div class="stat-value">${stat.value}</div>
                        <div class="stat-bar">
                            <div class="stat-bar-fill" style="width: ${(stat.value / stat.maxValue) * 100}%"></div>
                        </div>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="pokemon-tcg-row">
            ${cardImages.map((card, index) => `
                <div class="pokemon-tcg-card-img">
                    <div class="tcg-card-badge">${card.title.toUpperCase().includes('GX') || card.title.toUpperCase().includes('EX') ? card.title.match(/(GX|EX)/i)?.[0].toUpperCase() : `Card ${index + 1}`}</div>
                    <img src="${card.image}" 
                         alt="${detail.name} carta ${index + 1}" 
                         class="tcg-card-img">
                </div>
            `).join('')}
        </div>
    `;

    detailModal.classList.add('active');
}

// ===========================
// EVENT LISTENERS
// ===========================

searchBtn.addEventListener('click', () => {
    state.searchQuery = searchInput.value;
    filterPokemon();
});

searchInput.addEventListener('keyup', (e) => {
    if (e.key === 'Enter') {
        state.searchQuery = searchInput.value;
        filterPokemon();
    }
});

typeFilter.addEventListener('change', (e) => {
    state.selectedType = e.target.value;
    filterPokemon();
});

themeToggle.addEventListener('click', () => {
    state.isDarkMode = !state.isDarkMode;
    document.body.classList.toggle('dark-mode');
    localStorage.setItem('darkMode', state.isDarkMode);
    updateThemeIcon();
});

closeBtn.addEventListener('click', () => {
    detailModal.classList.remove('active');
});

detailModal.addEventListener('click', (e) => {
    if (e.target === detailModal) {
        detailModal.classList.remove('active');
    }
});

// ===========================
// FUNÇÃO DE INICIALIZAÇÃO
// ===========================

function initApp() {
    // Aplicar tema escuro se salvo
    if (state.isDarkMode) {
        document.body.classList.add('dark-mode');
    }
    updateThemeIcon();

    // Buscar e exibir Pokémon
    fetchPokemonList();
}

function updateThemeIcon() {
    const icon = themeToggle.querySelector('i');
    icon.classList.toggle('fa-moon');
    icon.classList.toggle('fa-sun');
}

// Inicializar app quando DOM estiver pronto
document.addEventListener('DOMContentLoaded', initApp);
