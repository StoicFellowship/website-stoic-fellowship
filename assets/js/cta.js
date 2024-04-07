class CTATemplate extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <section id="cta">
      <header>
        <h2>Ready to <strong>join</strong> us?</h2>
        <p>We're ready to help you get started.</p>
      </header>
      <footer>
        <ul class="buttons">
          <li>
            <a href="join.html" class="button special"
              >Join The Stoic Fellowship</a
            >
          </li>
        </ul>
      </footer>
    </section> `
  }
}

customElements.define('cta-template', CTATemplate)
