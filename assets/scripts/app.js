// ===========================
// CONFIGURAÇÕES GLOBAIS
// ===========================

const API_BASE = 'https://pokeapi.co/api/v2';
const TCG_API_BASE = 'https://api.pokemontcg.io/v2';
const TCG_API_KEY = ''; // opcional: defina sua chave da Pokémon TCG API aqui
const POKEMON_PER_PAGE = 50;
const POKEMON_TYPES = [
    'normal','fire','water','grass','electric','ice','fighting','poison',
    'ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'
];

// ===========================
// ESTADO DA APLICAÇÃO
// ===========================

const state = {
    allPokemon: [],
    filteredPokemon: [],
    currentPage: 0,
    selectedType: '',
    selectedOrder: 'id-asc',
    searchQuery: '',
    isDarkMode: localStorage.getItem('darkMode') === 'true'
};

// ===========================
// ELEMENTOS DO DOM
// ===========================

const pokemonGrid = document.getElementById('pokemonGrid');
const pagination = document.getElementById('pagination');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const typeFilter = document.getElementById('typeFilter');
const orderFilter = document.getElementById('orderFilter');
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

        const typeMap = await fetchPokemonTypes();

        const pokemonList = data.results.map(pokemon => ({
            name: pokemon.name,
            url: pokemon.url,
            id: getPokemonIdFromUrl(pokemon.url),
            types: typeMap[pokemon.name] || []
        }));

        state.allPokemon = pokemonList;
        state.filteredPokemon = pokemonList;
        displayPokemon();
        typeFilter.disabled = false;
        typeFilter.title = '';
    } catch (error) {
        console.error('Erro ao buscar Pokémon:', error);
        pokemonGrid.innerHTML = '<div class="empty-state"><i class="fas fa-exclamation-circle"></i><p>Erro ao carregar Pokémon</p></div>';
    }
}

/**
 * Busca os tipos e associa cada pokémon ao seu tipo
 */
async function fetchPokemonTypes() {
    const typeRequests = POKEMON_TYPES.map(type =>
        fetch(`${API_BASE}/type/${type}`).then(res => {
            if (!res.ok) throw new Error(`Falha ao buscar tipo ${type}`);
            return res.json();
        })
    );

    const typesData = await Promise.all(typeRequests);
    const typeMap = {};

    typesData.forEach(typeInfo => {
        const typeName = typeInfo.name;
        typeInfo.pokemon.forEach(entry => {
            const name = entry.pokemon.name;
            if (!typeMap[name]) typeMap[name] = [];
            typeMap[name].push({ type: { name: typeName } });
        });
    });

    return typeMap;
}

/**
 * Extrai o ID do Pokémon a partir da URL de detalhe
 */
function getPokemonIdFromUrl(url) {
    const parts = url.split('/').filter(Boolean);
    return parseInt(parts[parts.length - 1], 10);
}

function getPokemonImageUrl(id) {
    return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/${id}.png`;
}

async function fetchPokemonDetail(pokemonReference) {
    if (pokemonReference.details) {
        return pokemonReference.details;
    }

    const response = await fetch(pokemonReference.url);
    const detail = await response.json();
    pokemonReference.details = detail;
    return detail;
}

/**
 * Busca até duas cartas TCG do Pokémon se disponíveis
 */
async function fetchPokemonTcgCards(pokemonName) {
    try {
        // Tentar busca exata primeiro
        let url = `${TCG_API_BASE}/cards?q=name:"${pokemonName}"&pageSize=4`;
        let headers = TCG_API_KEY ? { 'X-Api-Key': TCG_API_KEY } : {};
        let response = await fetch(url, { headers });
        let data = response.ok ? await response.json() : { data: [] };

        // Se não encontrou, tentar busca parcial (sem aspas)
        if (!data.data || data.data.length === 0) {
            url = `${TCG_API_BASE}/cards?q=name:${pokemonName}*&pageSize=4`;
            response = await fetch(url, { headers });
            data = response.ok ? await response.json() : { data: [] };
        }

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
        pagination.innerHTML = '';
        return;
    }

    const start = state.currentPage * POKEMON_PER_PAGE;
    const end = start + POKEMON_PER_PAGE;
    const pagePokemon = state.filteredPokemon.slice(start, end);

    pokemonGrid.innerHTML = pagePokemon.map(pokemon => {
        const favoriteIcon = pokemon.name.toLowerCase() === 'marshadow' ? '<i class="fas fa-heart favorite-icon" title="Melhor Pokémon"></i>' : '';
        const cardClass = pokemon.name.toLowerCase() === 'marshadow' ? 'pokemon-card marshadow-card' : 'pokemon-card';
        const imageContent = `<img src="${getPokemonImageUrl(pokemon.id)}" alt="${pokemon.name}" class="pokemon-image">`;
        const typeBadges = (pokemon.types || []).map(type => `<span class="type-badge type-${type.type.name}">${type.type.name}</span>`).join('');

        return `
        <div class="${cardClass}" onclick="showPokemonDetail(${pokemon.id})">
            <div class="pokemon-id">#${String(pokemon.id).padStart(4, '0')}</div>
            ${imageContent}
            <div class="pokemon-name">${pokemon.name} ${favoriteIcon}</div>
            <div class="pokemon-types">${typeBadges}</div>
        </div>
    `;
    }).join('');

    renderPagination();
}

function renderPagination() {
    const totalPages = Math.ceil(state.filteredPokemon.length / POKEMON_PER_PAGE);
    if (totalPages <= 1) {
        pagination.innerHTML = '';
        return;
    }

    const prevDisabled = state.currentPage === 0 ? 'disabled' : '';
    const nextDisabled = state.currentPage === totalPages - 1 ? 'disabled' : '';

    pagination.innerHTML = `
        <button class="page-btn" ${prevDisabled} onclick="goToPage(${state.currentPage - 1})">Anterior</button>
        <span class="page-info">Página ${state.currentPage + 1} de ${totalPages}</span>
        <button class="page-btn" ${nextDisabled} onclick="goToPage(${state.currentPage + 1})">Próxima</button>
    `;
}

function goToPage(page) {
    const totalPages = Math.ceil(state.filteredPokemon.length / POKEMON_PER_PAGE);
    if (page < 0 || page >= totalPages) return;
    state.currentPage = page;
    displayPokemon();
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
            (pokemon.types || []).some(type => type.type.name === state.selectedType);

        return matchesSearch && matchesType;
    });

    state.currentPage = 0;
    sortPokemon();
    displayPokemon();
}

function sortPokemon() {
    state.filteredPokemon.sort((a, b) => {
        switch (state.selectedOrder) {
            case 'name-asc':
                return a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' });
            case 'id-desc':
                return b.id - a.id;
            case 'id-asc':
            default:
                return a.id - b.id;
        }
    });
}

/**
 * Mostra detalhes do Pokémon no modal
 */
async function showPokemonDetail(pokemonId) {
    const pokemonReference = state.allPokemon.find(p => p.id === pokemonId);
    
    if (!pokemonReference) return;

    const detail = await fetchPokemonDetail(pokemonReference);

    const stats = detail.stats.map(stat => ({
        name: stat.stat.name,
        value: stat.base_stat,
        maxValue: 255
    }));

    const abilities = detail.abilities.map(ability => ability.ability.name).join(', ');

    const favoriteIcon = detail.name.toLowerCase() === 'marshadow' ? '<i class="fas fa-heart favorite-icon" title="Melhor Pokémon"></i>' : '';
    const tcgCards = await fetchPokemonTcgCards(detail.name);
    const defaultImage = detail.sprites.other['official-artwork'].front_default || detail.sprites.front_default;
    const cardImages = [
        tcgCards[0] || { image: defaultImage, title: 'Imagem oficial' },
        tcgCards[1] || { image: defaultImage, title: 'Imagem oficial' }
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

orderFilter.addEventListener('change', (e) => {
    state.selectedOrder = e.target.value;
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

    // Desabilitar filtro de tipo enquanto não carregamos detalhes por pokémon
    typeFilter.disabled = true;
    typeFilter.title = 'Filtro de tipo não disponível sem detalhes completos por pokémon.';

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
