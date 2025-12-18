if (!customElements.get('product-add-to-cart-popup')) {
  customElements.define(
    'product-add-to-cart-popup',
    class ProductAddToCartPopup extends HTMLElement {
      connectedCallback() {
        this.enabled = this.dataset.enabled === 'true';
        this.showOnce = this.dataset.showOnce === 'true';
        this.storageKey = this.dataset.storageKey || 'atc-popup-shown';

        if (!this.enabled) return;

        this.popup = this.querySelector('.atc-popup');
        if (!this.popup) return;

        this.form = document.querySelector('product-form form');
        if (!this.form) return;

        if (this.showOnce && localStorage.getItem(this.storageKey)) {
          return;
        }

        this.bindUI();
        this.bindSubmit();
        this.bindVariantChange();
      }

      bindUI() {
        this.popup
          .querySelector('.atc-popup__close')
          ?.addEventListener('click', () => this.close());

        this.popup
          .querySelector('.atc-popup__overlay')
          ?.addEventListener('click', () => this.close());
      }

      bindSubmit() {
        this.onSubmit = (event) => {
          if (this.showOnce && localStorage.getItem(this.storageKey)) {
            return;
          }

          event.preventDefault();
          event.stopImmediatePropagation();

          this.open();
        };

        this.form.addEventListener('submit', this.onSubmit);
      }

      bindVariantChange() {
        this.parseExtraVariants();

        const mainVariantInput = this.form.querySelector('input[name="id"]');
        const popupForm = this.popup.querySelector('product-form');
        const popupVariantId = this.popup.querySelector('.product-variant-id');
        if (!mainVariantInput || !popupForm || !this.extraVariantsData) return;

        this.onVariantInputChange = () => {
          console.log('CHANGE')
          const variantId = mainVariantInput.value;
          popupVariantId.value = variantId;
          const variantConfig =
            this.extraVariantsData.variants?.[variantId];

          let items = null;

          if (variantConfig && Array.isArray(variantConfig.items)) {
            items = variantConfig.items;
          } else if (this.defaultExtraItems) {
            return;
          }

          this.renderExtraProducts(variantId);


          const updated = variantConfig.items.map((item) => ({
            ...item,
            parent_id: Number(variantId),
          }));

          popupForm.dataset.extraItems = JSON.stringify(updated);

          console.log('[STEP 2] variant extra items applied', updated);

        };


        this.onVariantInputChange();

        mainVariantInput.addEventListener('change', this.onVariantInputChange);
      }

      renderExtraProducts(variantId) {
        const wrapper = this.popup.querySelector('.extra-products-wrapper');
        if (!wrapper || !this.extraVariantsData) return;

        const scriptData = this.querySelector('script[data-extra-products-data]');
        if (!scriptData) return;

        let extraData;
        try {
          extraData = JSON.parse(scriptData.textContent);
        } catch (e) {
          console.error('Invalid JSON in data-extra-products-data', e);
          return;
        }

        let items =
          extraData.variants?.[variantId]?.items ||
          extraData.product?.items ||
          extraData.section?.items ||
          [];

        wrapper.innerHTML = '';

        if (!items || items.length === 0) return;

        items.forEach(item => {
          const productHTML = document.createElement('div');
          productHTML.className = 'extra-product-item';
          productHTML.innerHTML = ` 
              <img src="${item.image}" alt="${item.title}" class="extra-product-item__image"/>
              <div class="extra-product-item__info">
                <h4 class="extra-product-item__title">${item.title}</h4>
                <p>${item.description}</p>
                <p class="sku">SKU: ${item.sku}</p>
                <span class="extra-product-item__price">${item.price}</span><span class="extra-product-item__compare-price">${item.compare_at_price}</span>
              </div>
          `;
          wrapper.appendChild(productHTML);
        });
      }

      open() {
        this.popup.removeAttribute('hidden');
      }

      close() {
        this.popup.setAttribute('hidden', '');

        if (this.onSubmit) {
          this.form.removeEventListener('submit', this.onSubmit);
          this.onSubmit = null;
        }
      }

      parseExtraVariants() {
        if (this.extraVariantsParsed) return;

        const script = this.querySelector('script[data-extra-variants]');
        if (!script) return;

        try {
          this.extraVariantsData = JSON.parse(script.textContent);
          this.extraVariantsParsed = true;
        } catch (e) {
          console.error('[ATC POPUP] extra variants JSON invalid', e);
        }
      }

      disconnectedCallback() {
        if (this.onVariantInputChange) {
          const mainVariantInput = this.form?.querySelector('input[name="id"]');
          mainVariantInput?.removeEventListener('change', this.onVariantInputChange);
          this.onVariantInputChange = null;
        }
      }

    }
  );
}

(function () {
  function init() {
    const popupWrapper = document.querySelector('product-add-to-cart-popup');
    if (!popupWrapper) return;



    const popup = popupWrapper.querySelector('.atc-popup');
    const closeBtn = popupWrapper.querySelector('.atc-popup__close');
    const mainForm = document.querySelector('product-form form');

    if (!popup || !mainForm) return;

    const enabled = popupWrapper.dataset.enabled;
    const showOnce = popupWrapper.dataset.showOnce === 'true';
    const storageKey = popupWrapper.dataset.storageKey || 'atc-popup-shown';

    if (!enabled) return;

    mainForm.addEventListener(
      'submit',
      function (e) {
        const alreadyShown = showOnce && localStorage.getItem(storageKey);
        if (alreadyShown) return;

        e.preventDefault();
        e.stopImmediatePropagation();

        if (popupWrapper.open) {
          popupWrapper.open();

          if (showOnce) {
            localStorage.setItem(storageKey, 'true');
          }
        }
      },
      true
    );

    closeBtn?.addEventListener('click', () => {
      if (popupWrapper.close) {
        popupWrapper.close();
      }
    });
  }

  document.addEventListener('DOMContentLoaded', init);
  document.addEventListener('shopify:section:load', init);
})();
