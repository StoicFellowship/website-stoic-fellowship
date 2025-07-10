class HeaderTemplate extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
    <div id="header" class="alt">
    <a href="/" class="logo"
      ><img src="/images/logo/SVGs/Logo-2 - Inverted Logo - Wht-Purp Disc.svg" width="55px" height="55px"
    /></a>
    <nav id="nav">
      <ul>
        <li class="submenu">
          <a href="#">About</a>
          <ul>
            <li><a href="/mission">Mission</a></li>
            <li><a href="/team">Team</a></li>
            <li><a href="/contact">Contact Us</a></li>
          </ul>
        </li>
        <li class="submenu">
          <a href="#">Resources</a>
          <ul>
            <li>
              <a href="/resources/stoicism-resources">Stoicism Resources</a>
            </li>
            <li>
              <a href="/interviews">Interviews</a>
            </li>
            <li>
              <a href="https://stoicfellowship.substack.com/podcast" target="_blank">Podcast</a>
            </li>
            <li><a href="/service">Stoic Service</a></li>
          </ul>
        </li>
        <li class="current"><a href="/donate">Donate</a></li>
        <li><a href="/join" class="button special">Join Us</a></li>
      </ul>
    </nav>
  </div>`
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
          href="https://www.medium.com/@stoicfellowship"
          target="_blank"
          class="icon circle fa-medium"
          ><span class="label">Medium</span></a
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
