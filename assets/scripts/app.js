// ===========================
// CONFIGURAÇÕES GLOBAIS
// ===========================

const API_BASE = 'https://pokeapi.co/api/v2';
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
        
        // Buscar detalhes de cada Pokémon
        const pokemonDetails = await Promise.all(
            data.results.map(pokemon => fetch(pokemon.url).then(res => res.json()))
        );
        
        state.allPokemon = pokemonDetails;
        state.filteredPokemon = pokemonDetails;
        
        displayPokemon();
    } catch (error) {
        console.error('Erro ao buscar Pokémon:', error);
        pokemonGrid.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Erro ao carregar Pokémon</p></div>';
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
        return `
        <div class="pokemon-card" onclick="showPokemonDetail(${pokemon.id})">
            <div class="pokemon-id">#${String(pokemon.id).padStart(4, '0')}</div>
            <img src="${pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}" 
                 alt="${pokemon.name}" 
                 class="pokemon-image">
            <div class="pokemon-name">${pokemon.name} ${favoriteIcon}</div>
            <div class="pokemon-types">
                ${pokemon.types.map(type => `
                    <span class="type-badge type-${type.type.name}">${type.type.name}</span>
                `).join('')}
            </div>
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
function showPokemonDetail(pokemonId) {
    const pokemon = state.allPokemon.find(p => p.id === pokemonId);
    
    if (!pokemon) return;

    const stats = pokemon.stats.map(stat => ({
        name: stat.stat.name,
        value: stat.base_stat,
        maxValue: 255
    }));

    const abilities = pokemon.abilities.map(ability => ability.ability.name).join(', ');

    const favoriteIcon = pokemon.name.toLowerCase() === 'marshadow' ? '<i class="fas fa-heart favorite-icon" title="Melhor Pokémon"></i>' : '';
    modalBody.innerHTML = `
        <div class="pokemon-detail-header">
            <img src="${pokemon.sprites.other['official-artwork'].front_default || pokemon.sprites.front_default}" 
                 alt="${pokemon.name}" 
                 class="pokemon-detail-image">
            <div class="pokemon-detail-name">${pokemon.name} ${favoriteIcon}</div>
            <div class="pokemon-id">#${String(pokemon.id).padStart(4, '0')}</div>
            <div class="pokemon-types">
                ${pokemon.types.map(type => `
                    <span class="type-badge type-${type.type.name}">${type.type.name}</span>
                `).join('')}
            </div>
        </div>

        <div style="margin: 1.5rem 0;">
            <h3 style="margin-bottom: 0.5rem;">Informações</h3>
            <p><strong>Altura:</strong> ${(pokemon.height / 10).toFixed(1)} m</p>
            <p><strong>Peso:</strong> ${(pokemon.weight / 10).toFixed(1)} kg</p>
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
