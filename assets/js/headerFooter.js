class HeaderTemplate extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
    <div id="header">
    <a href="/" class="brand"
      ><img class="brand-logo" src="/images/logo/SVGs/logo1-white-trans.svg"
      /><span class="brand-divider"></span
      ><span class="brand-text"
        ><span class="brand-title">The Stoic Fellowship</span
        ><span class="brand-tagline">Building, Fostering, and Connecting<br />Communities of Stoics Around the World</span
      ></span
    ></a>
    <nav id="nav">
      <ul>
        <li class="submenu">
          <a href="#">Get Involved</a>
          <ul>
            <li><a href="/find">Find a group</a></li>
            <li><a href="/start">Start a group</a></li>
            <li><a href="/membership">Run a group</a></li>
          </ul>
        </li>
        <li class="submenu">
          <a href="#">Resources</a>
          <ul>
            <li>
              <a href="/resources-facilitators">For Facilitators</a>
            </li>
            <li>
              <a href="/resources-study">For Study</a>
            </li>
            <li>
              <a href="/resources-practice">For Practice</a>
            </li>
            <li>
              <a href="/resources/stoicism-101">Stoicism 101</a>
            </li>
            <li>
              <a href="/resources-organization">Stoic Organizations</a>
            </li>
            <li>
              <a href="https://stoicfellowship.substack.com/podcast" target="_blank">Podcast</a>
            </li>
          </ul>
        </li>
        <li class="submenu">
          <a href="#">About</a>
          <ul>
            <li><a href="/mission">Mission</a></li>
            <li><a href="/team">Team</a></li>
            <li><a href="/contact">Contact Us</a></li>
          </ul>
        </li>
        <!-- <li class="current"><a href="/volunteer">Volunteer</a></li> -->
        <li class="current"><a href="/donate">Donate</a></li>
      </ul>
    </nav>
  </div>`

    const setHeaderHeightVar = () => {
      const header = this.querySelector('#header')
      if (!header) return
      const logo = this.querySelector('.brand-logo')
      const text = this.querySelector('.brand-text')
      if (logo && text) {
        const textH = text.getBoundingClientRect().height
        // Only match the logo to the text block when the text is actually
        // visible (i.e. at wider widths). When the text/divider are hidden
        // at narrower widths, leave the logo at its CSS floor size rather
        // than shrinking it further.
        if (textH > 0) {
          logo.style.height = textH + 'px'
        }
      }
      document.documentElement.style.setProperty('--header-h', header.offsetHeight + 'px')
    }
    setHeaderHeightVar()
    window.addEventListener('resize', setHeaderHeightVar)
  }
}

class FooterTemplate extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
    <footer id="footer">
    <ul class="icons">
      <li>
        <a
          href="https://www.facebook.com/stoicfellowship"
          target="_blank"
          class="icon circle fa-facebook"
          ><span class="label">Facebook</span></a
        >
      </li>
      <li>
        <a
          href="https://substack.com/@stoicfellowship"
          target="_blank"
          class="icon circle icon-substack"
          ><span class="label">Substack</span></a
        >
      </li>
      <li>
        <a
          href="https://www.instagram.com/stoicfellowship"
          target="_blank"
          class="icon circle fa-instagram"
          ><span class="label">Instagram</span></a
        >
      </li>
      <li>
        <a
          href="https://www.linkedin.com/company/stoic-fellowship"
          target="_blank"
          class="icon circle fa-linkedin"
          ><span class="label">Linkedin</span></a
        >
      </li>
    </ul>

    <ol class="foot">
      <li>
        &copy;
        <script type="text/javascript">
          document.write(new Date().getFullYear())
        </script>
        <strong>The Stoic Fellowship</strong>
      </li>
    </ol>

    <div>
      <p class="foot">
        The Stoic Fellowship is a registered 501(c)(3) nonprofit headquartered
        in the USA
        <br />
        <a href="/donate">Support The Stoic Fellowship</a>
      </p>
      <img src="/images/logo/SVGs/Logo-2 - Inverted Logo - Wht-Purp Disc.svg" width="10%" height="10%" />
      <br />
      <br />
      <a href="/privacy-policy">Privacy Policy</a>
      <br />
      <a href="/terms-of-use">Terms of Use</a>
    </div>
  </footer>`
  }
}

customElements.define('header-template', HeaderTemplate)
customElements.define('footer-template', FooterTemplate)
