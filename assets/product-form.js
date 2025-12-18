if (!customElements.get('product-form')) {
  customElements.define(
    'product-form',
    class ProductForm extends HTMLElement {
      constructor() {
        super();

        this.form = this.querySelector('form');
        this.variantIdInput.disabled = false;
        this.form.addEventListener('submit', this.onSubmitHandler.bind(this));

        this.cart =
          document.querySelector('cart-notification') ||
          document.querySelector('cart-drawer');

        this.submitButton = this.querySelector('[type="submit"]');
        this.submitButtonText = this.submitButton.querySelector('span');

        if (document.querySelector('cart-drawer')) {
          this.submitButton.setAttribute('aria-haspopup', 'dialog');
        }

        this.hideErrors = this.dataset.hideErrors === 'true';
      }

      async onSubmitHandler(evt) {
        evt.preventDefault();
        if (this.submitButton.getAttribute('aria-disabled') === 'true') return;

        this.handleErrorMessage();

        this.submitButton.setAttribute('aria-disabled', true);
        this.submitButton.classList.add('loading');
        this.querySelector('.loading__spinner')?.classList.remove('hidden');

        const mainVariantId = Number(this.variantIdInput.value);
        const qtyInput = this.form.querySelector('[name="quantity"]');
        const mainQty = Number(qtyInput?.value || 1);

        let extraItems = [];

        if (this.dataset.extraItems) {
          try {
            extraItems = JSON.parse(this.dataset.extraItems).filter(
              (item) => Number(item.id) > 0
            );
          } catch (e) {
            console.warn('Error data-extra-items');
          }
        }

        const items = [
          {
            id: mainVariantId,
            quantity: mainQty
          },
          ...extraItems
        ];

        const config = fetchConfig('javascript');
        config.headers['Content-Type'] = 'application/json';
        config.headers['X-Requested-With'] = 'XMLHttpRequest';
        config.body = JSON.stringify({ items });

        try {
          const addResponse = await fetch(
            routes.cart_add_url,
            config
          ).then((res) => res.json());

          if (addResponse.status) {
            publish(PUB_SUB_EVENTS.cartError, {
              source: 'product-form',
              productVariantId: mainVariantId,
              errors: addResponse.errors || addResponse.description,
              message: addResponse.message
            });

            this.handleErrorMessage(addResponse.description);
            this.error = true;
            return;
          }

          this.error = false;
          document.dispatchEvent(
            new CustomEvent('cart:item-added', {
              detail: {
                variantIds: items.map(item => Number(item.id))
              }
            })
          );
          this.closeAddToCartPopup();

          if (!this.cart) {
            window.location = window.routes.cart_url;
            return;
          }

          const sections = this.cart
            .getSectionsToRender()
            .map((section) => section.id)
            .join(',');

          const sectionsResponse = await fetch(
            `${routes.cart_url}?sections=${sections}`
          ).then((res) => res.json());

          const normalizedResponse = {
            sections: sectionsResponse
          };

          publish(PUB_SUB_EVENTS.cartUpdate, {
            source: 'product-form',
            productVariantId: mainVariantId,
            cartData: normalizedResponse
          });

          CartPerformance.measure('add:paint-updated-sections', () => {
            this.cart.renderContents(normalizedResponse);
          });
        } catch (error) {
          console.error(error);
        } finally {
          this.submitButton.classList.remove('loading');
          this.submitButton.removeAttribute('aria-disabled');
          this.querySelector('.loading__spinner')?.classList.add('hidden');

          CartPerformance.measureFromEvent('add:user-action', evt);
        }
      }
      closeAddToCartPopup() {
        const popup = this.closest('product-add-to-cart-popup');
        if (!popup) return;

        if (typeof popup.close === 'function') {
          popup.close();
        } else {
          popup.hidden = true;
        }
      }
      handleErrorMessage(errorMessage = false) {
        if (this.hideErrors) return;

        this.errorMessageWrapper =
          this.errorMessageWrapper ||
          this.querySelector('.product-form__error-message-wrapper');

        if (!this.errorMessageWrapper) return;

        this.errorMessage =
          this.errorMessage ||
          this.errorMessageWrapper.querySelector('.product-form__error-message');

        this.errorMessageWrapper.toggleAttribute('hidden', !errorMessage);

        if (errorMessage) {
          this.errorMessage.textContent = errorMessage;
        }
      }

      toggleSubmitButton(disable = true, text) {
        if (disable) {
          this.submitButton.setAttribute('disabled', 'disabled');
          if (text) this.submitButtonText.textContent = text;
        } else {
          this.submitButton.removeAttribute('disabled');
          this.submitButtonText.textContent =
            window.variantStrings.addToCart;
        }
      }

      get variantIdInput() {
        return this.form.querySelector('[name="id"]');
      }
    }
  );
}
