class HeaderTemplateChild extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <div id='header' class='alt'>
        <a href='/index.html' class='logo'>
          <img src='/images/logo/SVGs/Logo-2 - Inverted Logo - Wht-Purp Disc.svg' width='100px' height='55px' />
        </a>
        <nav id='nav'>
          <ul>
            <li class='current'>
              <a href='/stoic-groups.html'>Communities</a>
            </li>
            <li class='submenu'>
              <a href='#'>About</a>
              <ul>
                <li>
                  <a href='/mission.html'>Mission</a>
                </li>
                <li>
                  <a href='/team.html'>Team</a>
                </li>
                <li>
                  <a href='/donate.html'>Donate</a>
                </li>
              </ul>
            </li>
            <li class='submenu'>
              <a href='#'>Resources</a>
              <ul>
                <li>
                  <a href='/resources/stoicism-resources.html'>
                    Stoicism Resources
                  </a>
                </li>
                <li>
                  <a href='/interviews.html'>Interviews</a>
                </li>
                <li>
                  <a href='/service/index.html'>Stoic Service</a>
                </li>
              </ul>
            </li>
            <li class='current'>
              <a href='/contact.html'>Contact</a>
            </li>
            <li>
              <a href='/join.html' class='button special'>
                Join Us
              </a>
            </li>
          </ul>
        </nav>
      </div> `
  }
}

class FooterTemplateChild extends HTMLElement {
  connectedCallback() {
    this.innerHTML = `
      <footer id='footer'>
        <ul class='icons'>
          <li>
            <a
              href='https://www.facebook.com/stoicfellowship'
              target='_blank'
              class='icon circle fa-facebook'
            >
              <span class='label'>Facebook</span>
            </a>
          </li>
          <li>
            <a
              href='https://www.medium.com/@stoicfellowship'
              target='_blank'
              class='icon circle fa-medium'
            >
              <span class='label'>Medium</span>
            </a>
          </li>
          <li>
            <a
              href='https://www.twitter.com/StoicFellowship'
              target='_blank'
              class='icon circle fa-twitter'
            >
              <span class='label'>Twitter</span>
            </a>
          </li>
          <li>
            <a
              href='https://www.instagram.com/stoicfellowship'
              target='_blank'
              class='icon circle fa-instagram'
            >
              <span class='label'>Instagram</span>
            </a>
          </li>
          <li>
            <a
              href='https://www.linkedin.com/company/stoic-fellowship'
              target='_blank'
              class='icon circle fa-linkedin'
            >
              <span class='label'>Linkedin</span>
            </a>
          </li>
        </ul>

        <ol class='foot'>
          <li>
            &copy;
            <script type='text/javascript'>
              document.write(new Date().getFullYear())
            </script>
            <strong>The Stoic Fellowship</strong>
          </li>
        </ol>

        <div>
          <p class='foot'>
            The Stoic Fellowship is a registered 501(c)(3) nonprofit
            headquartered in the USA
            <br />
            <a href='/donate.html'>Support The Stoic Fellowship</a>
          </p>
          <img src='/images/logo/SVGs/Logo-2 - Inverted Logo - Wht-Purp Disc.svg' width='10%' height='10%' />
          <br />
          <br />
          <a href='/privacy-policy.html'>Privacy Policy</a>
          <br />
          <a href='/terms-of-use.html'>Terms of Use</a>
        </div>
      </footer> `
  }
}

customElements.define('header-template-child', HeaderTemplateChild)
customElements.define('footer-template-child', FooterTemplateChild)
