;(function () {
  // Study Stoicism -> Resource Library
  //
  // Data-driven: resources + author index are embedded as JSON in
  // #resource-library-data. This script builds the filter UI, computes
  // matches, and renders author-grouped cards (authors with 2+ works) plus
  // a compact list of single-work "additional resources" entries.
  //
  // Facet model: Category, Level, Media, Topics, and Relation each union
  // (OR) within themselves; the facets AND together; the search box
  // further narrows (AND) whatever the facets currently allow. An empty
  // facet selection means "no constraint from this facet" (show
  // everything), consistent across all five facets.

  var root = document.getElementById('resource-library')
  if (!root) return

  var dataEl = document.getElementById('resource-library-data')
  if (!dataEl) return

  var DATA
  try {
    DATA = JSON.parse(dataEl.textContent)
  } catch (e) {
    return
  }

  var RESOURCES = DATA.resources
  var AUTHORS = DATA.authors

  var CATEGORY_ORDER = [
    'Popular Introductions & Practice',
    'Philosophy & Scholarship',
    'Modern Adaptations & Selections',
  ]
  var LEVEL_ORDER = ['beginner', 'intermediate', 'advanced']
  var MEDIA_ORDER = ['book', 'article', 'graphic-novel']
  var RELATION_ORDER = ['direct', 'supporting', 'adaptation']

  var LEVEL_LABELS = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  }
  var MEDIA_LABELS = { book: 'Book', article: 'Article', 'graphic-novel': 'Graphic Novel' }
  var MEDIA_ICONS = { book: 'fa-book', article: 'fa-file-text-o', 'graphic-novel': 'fa-picture-o' }
  var RELATION_LABELS = { direct: 'Direct', supporting: 'Supporting', adaptation: 'Adaptation' }
  var CATEGORY_SHORT_LABELS = {
    'Popular Introductions & Practice': 'Popular Introductions & Practice',
    'Philosophy & Scholarship': 'Philosophy & Scholarship',
    'Modern Adaptations & Selections': 'Modern Adaptations & Selections',
  }

  var TOPICS_VISIBLE_DEFAULT = 16

  // ---- Precompute lookups -------------------------------------------

  var resourcesById = {}
  RESOURCES.forEach(function (r) {
    resourcesById[r.id] = r
    r._haystack = (
      r.authorDisplay + ' ' + r.title + ' ' + r.description + ' ' + r.topics.join(' ')
    ).toLowerCase()
    r._haystackWords = r._haystack.split(/[^a-z0-9]+/).filter(Boolean)
  })

  var topicCounts = {}
  RESOURCES.forEach(function (r) {
    r.topics.forEach(function (t) {
      topicCounts[t] = (topicCounts[t] || 0) + 1
    })
  })
  var topicsSortedByFrequency = Object.keys(topicCounts).sort(function (a, b) {
    return topicCounts[b] - topicCounts[a] || a.localeCompare(b)
  })

  var SMALL_WORDS = { as: 1, of: 1, a: 1, the: 1, in: 1, on: 1, for: 1, and: 1, to: 1 }
  var SPECIAL_TOPIC_LABELS = { cbt: 'CBT' }
  function topicLabel(slug) {
    if (SPECIAL_TOPIC_LABELS[slug]) return SPECIAL_TOPIC_LABELS[slug]
    return slug
      .split('-')
      .map(function (word, i) {
        if (i > 0 && SMALL_WORDS[word]) return word
        return word.charAt(0).toUpperCase() + word.slice(1)
      })
      .join(' ')
  }

  var authorsSorted = AUTHORS.slice().sort(function (a, b) {
    return a.name.localeCompare(b.name)
  })
  var cardAuthors = authorsSorted.filter(function (a) {
    return a.card
  })
  var rowAuthors = authorsSorted.filter(function (a) {
    return !a.card
  })

  function initials(name) {
    var parts = name.replace(/\([^)]*\)/g, '').trim().split(/\s+/)
    var first = parts[0] ? parts[0][0] : ''
    var last = parts.length > 1 ? parts[parts.length - 1][0] : ''
    return (first + last).toUpperCase()
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    })
  }

  // A title+subtitle combo (e.g. "Journal Like a Stoic: A 90-Day Stoicism
  // Program...") reliably wraps to two lines once it gets long, which is
  // what made the collapsed list feel cluttered. Rather than measuring
  // rendered width per item (fragile, viewport-dependent, and would re-run
  // on every filter re-render), we use the raw title length as a
  // deterministic proxy: only split at the colon once the combined string
  // is long enough that it would realistically wrap, so short "Title:
  // Subtitle" titles (e.g. "Stoic Ethics: The Basics") stay intact. 60 was
  // chosen by checking it against the actual dataset -- it catches the
  // long ones without over-truncating short titles into something too
  // generic, and produces no duplicate short-titles within any one
  // author's card.
  var TITLE_TRUNCATE_LENGTH = 60
  function splitTitle(title) {
    var idx = title.indexOf(':')
    if (idx !== -1 && title.length > TITLE_TRUNCATE_LENGTH) {
      return { short: title.slice(0, idx).trim(), subtitle: title.slice(idx + 1).trim() }
    }
    return { short: title, subtitle: null }
  }

  // ---- Fuzzy search ----------------------------------------------------

  function editDistanceAtMostOne(a, b) {
    if (a === b) return true
    var la = a.length,
      lb = b.length
    if (Math.abs(la - lb) > 1) return false
    var i = 0,
      j = 0,
      diff = 0
    while (i < la && j < lb) {
      if (a[i] === b[j]) {
        i++
        j++
        continue
      }
      diff++
      if (diff > 1) return false
      if (la === lb) {
        i++
        j++
      } else if (la > lb) {
        i++
      } else {
        j++
      }
    }
    if (i < la || j < lb) diff++
    return diff <= 1
  }

  function tokenMatches(words, token) {
    for (var i = 0; i < words.length; i++) {
      var w = words[i]
      if (w.indexOf(token) !== -1) return true
      if (token.length >= 4 && Math.abs(w.length - token.length) <= 1 && editDistanceAtMostOne(w, token)) {
        return true
      }
    }
    return false
  }

  function searchMatches(resource, query) {
    if (!query) return true
    if (resource._haystack.indexOf(query) !== -1) return true
    var tokens = query.split(/\s+/).filter(Boolean)
    return tokens.every(function (t) {
      return tokenMatches(resource._haystackWords, t)
    })
  }

  // ---- State -------------------------------------------------------

  var state = {
    q: '',
    category: new Set(),
    level: new Set(),
    media: new Set(),
    topics: new Set(),
    relation: new Set(),
  }

  var ALLOWED = {
    category: CATEGORY_ORDER,
    level: LEVEL_ORDER,
    media: MEDIA_ORDER,
    relation: RELATION_ORDER,
    topics: topicsSortedByFrequency,
  }

  function readStateFromURL() {
    var params = new URLSearchParams(window.location.search)
    state.q = params.get('q') || ''
    ;['category', 'level', 'media', 'relation', 'topics'].forEach(function (facet) {
      var raw = params.get(facet)
      state[facet] = new Set()
      if (raw) {
        raw.split(',').forEach(function (v) {
          if (ALLOWED[facet].indexOf(v) !== -1) state[facet].add(v)
        })
      }
    })
  }

  var urlUpdateTimer
  function writeStateToURL(immediate) {
    function apply() {
      var params = new URLSearchParams()
      if (state.q) params.set('q', state.q)
      ;['category', 'level', 'media', 'relation', 'topics'].forEach(function (facet) {
        if (state[facet].size) params.set(facet, Array.from(state[facet]).join(','))
      })
      var qs = params.toString()
      var hasAny = qs.length > 0
      var url =
        window.location.pathname + (qs ? '?' + qs : '') + (hasAny ? '#resource-library' : window.location.hash)
      window.history.replaceState(null, '', url)
    }
    window.clearTimeout(urlUpdateTimer)
    if (immediate) apply()
    else urlUpdateTimer = window.setTimeout(apply, 250)
  }

  // ---- Filter panel: static facet pills -----------------------------

  function buildFacetPills(container, facetName, order, labelFn) {
    if (!container) return
    container.innerHTML = order
      .map(function (value) {
        return (
          '<button type="button" class="filter-pill" data-facet="' +
          facetName +
          '" data-value="' +
          escapeHtml(value) +
          '" aria-pressed="false">' +
          escapeHtml(labelFn(value)) +
          '</button>'
        )
      })
      .join('')
  }

  var categoryContainer = root.querySelector('[data-facet="category"]')
  var levelContainer = root.querySelector('[data-facet="level"]')
  var mediaContainer = root.querySelector('[data-facet="media"]')
  var relationContainer = root.querySelector('[data-facet="relation"]')
  var topicsContainer = root.querySelector('[data-facet="topics"]')
  var moreTopicsBtn = document.getElementById('study-filters-more-topics')
  var topicsExpanded = false

  buildFacetPills(categoryContainer, 'category', CATEGORY_ORDER, function (v) {
    return CATEGORY_SHORT_LABELS[v] || v
  })
  buildFacetPills(levelContainer, 'level', LEVEL_ORDER, function (v) {
    return LEVEL_LABELS[v]
  })
  buildFacetPills(mediaContainer, 'media', MEDIA_ORDER, function (v) {
    return MEDIA_LABELS[v]
  })
  buildFacetPills(relationContainer, 'relation', RELATION_ORDER, function (v) {
    return RELATION_LABELS[v]
  })

  function renderTopicPills() {
    if (!topicsContainer) return
    var visible = topicsExpanded
      ? topicsSortedByFrequency
      : topicsSortedByFrequency.slice(0, TOPICS_VISIBLE_DEFAULT)
    topicsContainer.innerHTML = visible
      .map(function (t) {
        return (
          '<button type="button" class="filter-pill" data-facet="topics" data-value="' +
          escapeHtml(t) +
          '" aria-pressed="false">' +
          escapeHtml(topicLabel(t)) +
          '</button>'
        )
      })
      .join('')
    syncPillStates()
    if (moreTopicsBtn) {
      moreTopicsBtn.textContent = topicsExpanded ? 'Show fewer topics' : 'Show more topics'
      moreTopicsBtn.hidden = topicsSortedByFrequency.length <= TOPICS_VISIBLE_DEFAULT
    }
  }
  renderTopicPills()

  if (moreTopicsBtn) {
    moreTopicsBtn.addEventListener('click', function () {
      topicsExpanded = !topicsExpanded
      renderTopicPills()
    })
  }

  function syncPillStates() {
    root.querySelectorAll('.filter-pill[data-facet]').forEach(function (btn) {
      var facet = btn.getAttribute('data-facet')
      var value = btn.getAttribute('data-value')
      var active = state[facet] && state[facet].has(value)
      btn.classList.toggle('active', !!active)
      btn.setAttribute('aria-pressed', active ? 'true' : 'false')
    })
  }

  root.addEventListener('click', function (e) {
    var pill = e.target.closest('.filter-pill[data-facet]')
    if (!pill) return
    var facet = pill.getAttribute('data-facet')
    var value = pill.getAttribute('data-value')
    if (state[facet].has(value)) state[facet].delete(value)
    else state[facet].add(value)
    syncPillStates()
    renderAll()
    writeStateToURL(true)
  })

  // ---- More Filters disclosure ---------------------------------------

  var moreToggle = document.getElementById('study-filters-more-toggle')
  var advancedPanel = document.getElementById('study-filters-advanced')
  if (moreToggle && advancedPanel) {
    moreToggle.addEventListener('click', function () {
      var open = advancedPanel.hidden
      advancedPanel.hidden = !open
      moreToggle.setAttribute('aria-expanded', open ? 'true' : 'false')
    })
  }

  // ---- Mobile filters toggle ------------------------------------------

  var mobileToggle = document.getElementById('study-filters-mobile-toggle')
  var filtersPanel = document.getElementById('study-filters-panel')
  if (mobileToggle && filtersPanel) {
    mobileToggle.addEventListener('click', function () {
      var open = !filtersPanel.classList.contains('filters-open')
      filtersPanel.classList.toggle('filters-open', open)
      mobileToggle.setAttribute('aria-expanded', open ? 'true' : 'false')
    })
  }

  var filterCountBadge = document.getElementById('filter-count-badge')
  function updateFilterCountBadge() {
    var n =
      state.category.size + state.level.size + state.media.size + state.topics.size + state.relation.size
    if (filterCountBadge) {
      filterCountBadge.textContent = String(n)
      filterCountBadge.hidden = n === 0
    }
  }

  // ---- Search input ----------------------------------------------------

  var searchInput = document.getElementById('study-search')
  var searchDebounce
  if (searchInput) {
    searchInput.addEventListener('input', function () {
      window.clearTimeout(searchDebounce)
      searchDebounce = window.setTimeout(function () {
        state.q = searchInput.value.trim().toLowerCase()
        renderAll()
        writeStateToURL()
      }, 150)
    })
  }

  // ---- Active filter chips + clear all --------------------------------

  var activeRow = document.getElementById('study-filters-active-row')
  function labelFor(facet, value) {
    if (facet === 'category') return CATEGORY_SHORT_LABELS[value] || value
    if (facet === 'level') return LEVEL_LABELS[value]
    if (facet === 'media') return MEDIA_LABELS[value]
    if (facet === 'relation') return RELATION_LABELS[value]
    if (facet === 'topics') return topicLabel(value)
    return value
  }

  function renderActiveChips() {
    if (!activeRow) return
    var chips = []
    ;['category', 'level', 'media', 'topics', 'relation'].forEach(function (facet) {
      state[facet].forEach(function (value) {
        chips.push(
          '<span class="active-filter-chip">' +
            escapeHtml(labelFor(facet, value)) +
            '<button type="button" data-remove-facet="' +
            facet +
            '" data-remove-value="' +
            escapeHtml(value) +
            '" aria-label="Remove filter ' +
            escapeHtml(labelFor(facet, value)) +
            '">&times;</button></span>'
        )
      })
    })
    var hasAny = chips.length > 0 || !!state.q
    var html = chips.join('')
    if (hasAny) {
      html +=
        '<button type="button" class="study-filters-reset" id="study-filters-clear-all">Clear all filters</button>'
    }
    activeRow.innerHTML = html
  }

  function clearAllFilters() {
    state.category.clear()
    state.level.clear()
    state.media.clear()
    state.topics.clear()
    state.relation.clear()
    state.q = ''
    if (searchInput) searchInput.value = ''
    syncPillStates()
    renderAll()
    writeStateToURL(true)
  }

  document.addEventListener('click', function (e) {
    var removeBtn = e.target.closest('[data-remove-facet]')
    if (removeBtn) {
      var facet = removeBtn.getAttribute('data-remove-facet')
      var value = removeBtn.getAttribute('data-remove-value')
      state[facet].delete(value)
      syncPillStates()
      renderAll()
      writeStateToURL(true)
      return
    }
    if (e.target.id === 'study-filters-clear-all') {
      clearAllFilters()
      return
    }
    if (e.target.closest('.study-filters-reset-inline')) {
      clearAllFilters()
      return
    }
    if (e.target.closest('.study-search-clear-inline')) {
      state.q = ''
      if (searchInput) searchInput.value = ''
      renderAll()
      writeStateToURL(true)
      return
    }
  })

  // ---- Matching + rendering the resource list -------------------------

  var listEl = document.getElementById('resource-library-list')
  var countEl = document.getElementById('resource-count-num')
  var noResultsEl = document.getElementById('study-no-results')

  function resourceMatchesFacets(r) {
    if (state.category.size && !state.category.has(r.category)) return false
    if (state.level.size && !state.level.has(r.level)) return false
    if (state.media.size && !state.media.has(r.media)) return false
    if (state.relation.size && !state.relation.has(r.relation)) return false
    if (state.topics.size && !r.topics.some(function (t) { return state.topics.has(t) })) return false
    return true
  }

  // Sets a toggle button + its details panel to a given open/closed state,
  // keeping the hidden attribute, aria-expanded, the +/- icon, and the
  // aria-label all in sync. Shared by the per-item toggle and "Expand all".
  function setDetailsOpen(toggle, open) {
    var descId = toggle.getAttribute('aria-controls')
    var details = descId && document.getElementById(descId)
    if (details) details.hidden = !open
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false')
    toggle.setAttribute('aria-label', open ? 'Hide details' : 'Show details')
    var icon = toggle.querySelector('.fa')
    if (icon) {
      icon.classList.toggle('fa-plus-circle', !open)
      icon.classList.toggle('fa-minus-circle', open)
    }
  }

  function renderWorkItem(r, opts) {
    opts = opts || {}
    var icon = MEDIA_ICONS[r.media] || 'fa-book'
    var titleParts = splitTitle(r.title)
    var byline = ''
    if (opts.showByline) {
      byline = '<div class="resource-work-byline">by ' + escapeHtml(r.authorDisplay) + '</div>'
    }
    var linkLabel =
      r.media === 'book' ? 'View on Goodreads' : r.media === 'graphic-novel' ? 'View on Goodreads' : 'Read online'
    var levelBadge =
      '<span class="resource-badge resource-badge-level-' +
      r.level +
      '">' +
      LEVEL_LABELS[r.level] +
      '</span>'
    var categoryBadge =
      '<span class="resource-badge resource-badge-category">' +
      escapeHtml(CATEGORY_SHORT_LABELS[r.category] || r.category) +
      '</span>'
    var descId = 'desc-' + r.id + (opts.idSuffix || '')
    var subtitleHtml = titleParts.subtitle
      ? '<p class="resource-subtitle">' + escapeHtml(titleParts.subtitle) + '</p>'
      : ''
    return (
      '<div class="resource-work-line">' +
      '<i class="fa ' +
      icon +
      ' resource-work-media-icon" aria-hidden="true" title="' +
      escapeHtml(MEDIA_LABELS[r.media]) +
      '"></i>' +
      '<a class="resource-work-title resource-work-title-link" href="' +
      escapeHtml(r.url) +
      '" target="_blank" rel="noopener" title="' +
      escapeHtml(linkLabel) +
      '" aria-label="' +
      escapeHtml(titleParts.short) +
      ' — ' +
      escapeHtml(linkLabel) +
      '">' +
      escapeHtml(titleParts.short) +
      '</a>' +
      '<button type="button" class="resource-more-toggle" aria-expanded="false" aria-controls="' +
      descId +
      '" aria-label="Show details"><i class="fa fa-plus-circle" aria-hidden="true"></i></button>' +
      byline +
      '</div>' +
      '<div class="resource-details" id="' +
      descId +
      '" hidden>' +
      subtitleHtml +
      '<p class="resource-description">' +
      escapeHtml(r.description) +
      '</p>' +
      '<div class="resource-badges">' +
      levelBadge +
      categoryBadge +
      '</div>' +
      '</div>'
    )
  }

  function renderAuthorCard(author, workIds) {
    var photoHtml
    if (author.photo) {
      var img = '<img src="' + escapeHtml(author.photo) + '" alt="' + escapeHtml(author.name) + '" />'
      photoHtml = author.link
        ? '<a href="' + escapeHtml(author.link) + '" target="_blank" rel="noopener" class="image featured">' + img + '</a>'
        : '<span class="image featured">' + img + '</span>'
    } else {
      photoHtml = '<div class="author-avatar-monogram">' + escapeHtml(initials(author.name)) + '</div>'
    }
    var nameHtml = author.link
      ? '<a href="' + escapeHtml(author.link) + '" target="_blank" rel="noopener">' + escapeHtml(author.name) + '</a>'
      : escapeHtml(author.name)
    var bioHtml = author.bio ? '<p class="author-desc">' + escapeHtml(author.bio) + '</p>' : ''
    var itemsHtml = workIds
      .map(function (id) {
        // A work co-credited to multiple card authors (there are a
        // handful) renders once per author's card; scope the details id
        // to this author so each copy gets its own unique id instead of
        // colliding on "desc-<resourceId>" and having getElementById
        // resolve every one of them to whichever copy happens to be
        // first in the document.
        return (
          '<li class="resource-work-item">' +
          renderWorkItem(resourcesById[id], { idSuffix: '-' + author.slug }) +
          '</li>'
        )
      })
      .join('')
    var expandAllHtml =
      workIds.length > 1
        ? '<button type="button" class="card-expand-all" aria-expanded="false">Expand all</button>'
        : ''
    return (
      '<section class="author-card">' +
      '<div class="author-card-head">' +
      photoHtml +
      '<div class="author-info"><h3>' +
      nameHtml +
      '</h3>' +
      bioHtml +
      '</div></div>' +
      expandAllHtml +
      '<ul class="works">' +
      itemsHtml +
      '</ul>' +
      '</section>'
    )
  }

  function renderAll() {
    var matchedIds = []
    var matchedSet = new Set()
    RESOURCES.forEach(function (r) {
      if (resourceMatchesFacets(r) && searchMatches(r, state.q)) {
        matchedIds.push(r.id)
        matchedSet.add(r.id)
      }
    })

    if (countEl) countEl.textContent = String(matchedIds.length)
    if (noResultsEl) noResultsEl.hidden = matchedIds.length > 0

    var cardsHtml = ''
    cardAuthors.forEach(function (author) {
      var visibleWorkIds = author.workIds.filter(function (id) {
        return matchedSet.has(id)
      })
      if (!visibleWorkIds.length) return
      cardsHtml += renderAuthorCard(author, visibleWorkIds)
    })

    var rowsHtml = ''
    rowAuthors.forEach(function (author) {
      var visibleWorkIds = author.workIds.filter(function (id) {
        return matchedSet.has(id)
      })
      if (!visibleWorkIds.length) return
      visibleWorkIds.forEach(function (id) {
        rowsHtml +=
          '<div class="resource-row">' +
          renderWorkItem(resourcesById[id], { showByline: true, idSuffix: '-' + author.slug }) +
          '</div>'
      })
    })

    var html = ''
    if (cardsHtml) {
      html += '<div class="resource-authors-grid">' + cardsHtml + '</div>'
    }
    if (rowsHtml) {
      html +=
        '<h4 class="resource-additional-heading">Additional Resources</h4>' +
        '<div class="resource-additional-list">' +
        rowsHtml +
        '</div>'
    }
    if (listEl) listEl.innerHTML = html

    renderActiveChips()
    updateFilterCountBadge()
  }

  listEl.addEventListener('click', function (e) {
    var expandAll = e.target.closest('.card-expand-all')
    if (expandAll) {
      var card = expandAll.closest('.author-card')
      var opening = expandAll.getAttribute('aria-expanded') !== 'true'
      if (card) {
        card.querySelectorAll('.resource-more-toggle').forEach(function (t) {
          setDetailsOpen(t, opening)
        })
      }
      expandAll.setAttribute('aria-expanded', opening ? 'true' : 'false')
      expandAll.textContent = opening ? 'Collapse all' : 'Expand all'
      return
    }
    var toggle = e.target.closest('.resource-more-toggle')
    if (!toggle) return
    var descId = toggle.getAttribute('aria-controls')
    var details = document.getElementById(descId)
    if (!details) return
    setDetailsOpen(toggle, details.hidden)
  })

  // ---- Init -------------------------------------------------------------

  readStateFromURL()
  if (searchInput) searchInput.value = state.q
  syncPillStates()
  if (
    Array.from(state.topics).some(function (t) {
      return topicsSortedByFrequency.indexOf(t) >= TOPICS_VISIBLE_DEFAULT
    })
  ) {
    topicsExpanded = true
    renderTopicPills()
  }
  renderAll()

  window.addEventListener('popstate', function () {
    readStateFromURL()
    if (searchInput) searchInput.value = state.q
    syncPillStates()
    renderAll()
  })
})()
