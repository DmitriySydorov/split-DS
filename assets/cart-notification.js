class CartNotification extends HTMLElement {
  constructor() {
    super();

    this.notification = document.getElementById('cart-notification');
    this.header = document.querySelector('sticky-header');
    this.onBodyClick = this.handleBodyClick.bind(this);

    document.addEventListener(
      'cart:item-added',
      this.onItemsAdded.bind(this)
    );

    this.notification.addEventListener('keyup', (evt) => evt.code === 'Escape' && this.close());
    this.querySelectorAll('button[type="button"]').forEach((closeButton) =>
      closeButton.addEventListener('click', this.close.bind(this))
    );
  }

  open() {
    this.notification.classList.add('animate', 'active');

    this.notification.addEventListener(
      'transitionend',
      () => {
        this.notification.focus();
        trapFocus(this.notification);
      },
      { once: true }
    );

    document.body.addEventListener('click', this.onBodyClick);
  }

  close() {
    this.notification.classList.remove('active');
    document.body.removeEventListener('click', this.onBodyClick);

    removeTrapFocus(this.activeElement);
  }

  filterOnlyAddedItems() {
    if (!this.addedVariantIds || !this.addedVariantIds.length) return;

    const items = this.notification.querySelectorAll(
      '[data-cart-item][data-variant-id]'
    );

    const seenVariants = new Set();

    items.forEach((item) => {
      const variantId = Number(item.dataset.variantId);

      if (!this.addedVariantIds.includes(variantId) || seenVariants.has(variantId)) {
        item.style.display = 'none';
      } else {
        seenVariants.add(variantId);
      }
    });
  }



  renderContents(parsedState) {
    this.getSectionsToRender().forEach((section) => {
      document.getElementById(section.id).innerHTML =
        this.getSectionInnerHTML(parsedState.sections[section.id], section.selector);
    });

    this.filterOnlyAddedItems();

    if (this.header) this.header.reveal();
    this.open();
  }

  onItemsAdded(event) {
    this.addedVariantIds = event.detail.variantIds || [];
  }

  getSectionsToRender() {
    return [
      {
        id: 'cart-notification-product',
        selector: '.shopify-section'
      },
      {
        id: 'cart-notification-button',
        selector: '.shopify-section'
      },
      {
        id: 'cart-icon-bubble',
        selector: '.shopify-section'
      }
    ];
  }

  getSectionInnerHTML(html, selector = '.shopify-section') {
    return new DOMParser().parseFromString(html, 'text/html').querySelector(selector).innerHTML;
  }

  handleBodyClick(evt) {
    const target = evt.target;
    if (target !== this.notification && !target.closest('cart-notification')) {
      const disclosure = target.closest('details-disclosure, header-menu');
      this.activeElement = disclosure ? disclosure.querySelector('summary') : null;
      this.close();
    }
  }

  setActiveElement(element) {
    this.activeElement = element;
  }
}

customElements.define('cart-notification', CartNotification);
