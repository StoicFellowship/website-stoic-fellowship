// Click-to-play YouTube embeds.
// Markup: <a class="video-embed" href="https://www.youtube.com/watch?v=ID" data-video-id="ID"
//           data-title="Video title"> ... thumbnail + play button ... </a>
// Shows a lightweight thumbnail at the correct 16:9 shape and only loads the
// YouTube player (privacy-enhanced youtube-nocookie.com) when clicked. Without
// JavaScript the link simply opens the video on YouTube.
document.querySelectorAll('a.video-embed[data-video-id]').forEach((link) => {
  link.addEventListener('click', (e) => {
    e.preventDefault()
    const id = encodeURIComponent(link.dataset.videoId)
    const iframe = document.createElement('iframe')
    iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0`
    iframe.title = link.dataset.title || 'YouTube video'
    iframe.allow =
      'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
    iframe.allowFullscreen = true
    iframe.setAttribute('frameborder', '0')

    const wrapper = document.createElement('div')
    wrapper.className = 'video-embed is-playing'
    wrapper.appendChild(iframe)
    link.replaceWith(wrapper)
    iframe.focus()
  })
})
