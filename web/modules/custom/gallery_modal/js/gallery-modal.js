/**
 * @file
 * Gallery modal behavior — opens photos in a dialog with comments and sharing.
 */
(function ($, Drupal, once) {

  'use strict';

  function copyTextToClipboard(text) {
    if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
      return navigator.clipboard.writeText(text);
    }

    return new Promise(function (resolve, reject) {
      try {
        var textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();

        var copied = document.execCommand('copy');
        document.body.removeChild(textarea);

        if (copied) {
          resolve();
        }
        else {
          reject(new Error('Copy command failed'));
        }
      }
      catch (err) {
        reject(err);
      }
    });
  }

  Drupal.behaviors.galleryModal = {
    attach: function (context) {
      // Disable right-click and drag on gallery and modal images.
      once('gallery-no-download', 'img', context).forEach(function (img) {
        if (img.closest('.gallery-modal-trigger') || img.closest('.gallery-modal')) {
          img.addEventListener('contextmenu', function (e) { e.preventDefault(); });
          img.addEventListener('dragstart', function (e) { e.preventDefault(); });
        }
      });

      // Create a hidden container for dialog trigger links (outside masonry).
      var linkContainer = document.getElementById('gallery-modal-links');
      if (!linkContainer) {
        linkContainer = document.createElement('div');
        linkContainer.id = 'gallery-modal-links';
        linkContainer.setAttribute('aria-hidden', 'true');
        linkContainer.style.cssText = 'position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0);';
        document.body.appendChild(linkContainer);
      }

      var needsBinding = false;

      // For each gallery item, create a hidden use-ajax link and bind a click handler.
      once('gallery-modal', '.gallery-modal-trigger[data-media-id]', context).forEach(function (el) {
        var mid = el.getAttribute('data-media-id');
        var linkId = 'gallery-modal-link-' + mid;

        if (!document.getElementById(linkId)) {
          var link = document.createElement('a');
          link.id = linkId;
          link.href = Drupal.url('gallery/' + mid + '/modal');
          link.className = 'use-ajax';
          link.setAttribute('data-dialog-type', 'modal');
          link.setAttribute('data-dialog-options', JSON.stringify({
            width: '90%',
            maxWidth: 1200,
            dialogClass: 'gallery-modal-dialog'
          }));
          linkContainer.appendChild(link);
          needsBinding = true;
        }

        el.style.cursor = 'pointer';

        el.addEventListener('click', function (e) {
          e.preventDefault();
          var hiddenLink = document.getElementById('gallery-modal-link-' + mid);
          if (hiddenLink) {
            $(hiddenLink).trigger('click');
          }
        });
      });

      // Initialize dialog links only when new ones were added.
      if (needsBinding) {
        Drupal.ajax.bindAjaxLinks(linkContainer);
      }
    }
  };

  /**
   * Open Facebook share link in a popup; copy URL to clipboard for Instagram/TikTok.
   */
  Drupal.behaviors.galleryModalShare = {
    attach: function (context) {
      // Facebook: open in popup window.
      once('gallery-share-fb', '.gallery-modal__share-link--facebook', context).forEach(function (link) {
        link.addEventListener('click', function (e) {
          e.preventDefault();
          var url = link.getAttribute('href');
          var width = 600;
          var height = 400;
          var left = (screen.width - width) / 2;
          var top = (screen.height - height) / 2;
          window.open(url, 'share', 'width=' + width + ',height=' + height + ',left=' + left + ',top=' + top + ',toolbar=no,menubar=no');
        });
      });

      // Copy link button: copy share URL to clipboard.
      once('gallery-share-copy', '.gallery-modal__share-link--copy', context).forEach(function (btn) {
        btn.addEventListener('click', function () {
          var shareLinks = btn.closest('.gallery-modal__share-links');
          var toastEl = shareLinks ? shareLinks.querySelector('.gallery-modal__share-toast') : null;
          var shareUrl = btn.getAttribute('data-share-url') || '';

          if (shareUrl && shareUrl.indexOf('http') !== 0) {
            shareUrl = new URL(shareUrl, window.location.origin).toString();
          }

          var showToast = function (message, isError) {
            if (!toastEl) {
              return;
            }
            toastEl.textContent = message;
            toastEl.classList.toggle('is-error', !!isError);
            toastEl.classList.add('is-visible');

            if (toastEl._hideTimer) {
              window.clearTimeout(toastEl._hideTimer);
            }

            toastEl._hideTimer = window.setTimeout(function () {
              toastEl.classList.remove('is-visible', 'is-error');
            }, 1800);
          };

          if (!shareUrl) {
            showToast(Drupal.t('Unable to copy link.'), true);
            return;
          }

          copyTextToClipboard(shareUrl).then(function () {
            showToast(Drupal.t('Copied to clipboard!'));
          }).catch(function () {
            showToast(Drupal.t('Unable to copy link.'), true);
          });
        });
      });
    }
  };

  /**
   * Handle navigation between photos in the modal.
   */
  Drupal.behaviors.galleryModalNav = {
    attach: function (context) {
      once('gallery-modal-nav', '.gallery-modal__nav', context).forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          e.stopPropagation();
          
          var mediaId = btn.getAttribute('data-media-id');
          if (!mediaId) {
            return;
          }

          // Find or create the hidden AJAX link for this media.
          var linkContainer = document.getElementById('gallery-modal-links');
          if (!linkContainer) {
            console.error('Gallery modal links container not found');
            return;
          }

          var linkId = 'gallery-modal-link-' + mediaId;
          var hiddenLink = document.getElementById(linkId);
          
          if (!hiddenLink) {
            // Create the link if it doesn't exist yet.
            hiddenLink = document.createElement('a');
            hiddenLink.id = linkId;
            hiddenLink.href = Drupal.url('gallery/' + mediaId + '/modal');
            hiddenLink.className = 'use-ajax';
            hiddenLink.setAttribute('data-dialog-type', 'modal');
            hiddenLink.setAttribute('data-dialog-options', JSON.stringify({
              width: '90%',
              maxWidth: 1200,
              dialogClass: 'gallery-modal-dialog'
            }));
            linkContainer.appendChild(hiddenLink);
            
            // Initialize AJAX for the new link.
            Drupal.ajax.bindAjaxLinks(linkContainer);
          }

          // Trigger the click on the hidden AJAX link.
          $(hiddenLink).trigger('click');
        });
      });

      // Add keyboard navigation (arrow keys).
      once('gallery-modal-keyboard', '.gallery-modal', context).forEach(function (modal) {
        // Listen for keydown on the document when modal is open.
        var keyHandler = function (e) {
          // Left arrow = previous.
          if (e.key === 'ArrowLeft' || e.keyCode === 37) {
            var prevBtn = modal.querySelector('.gallery-modal__nav--prev');
            if (prevBtn) {
              e.preventDefault();
              prevBtn.click();
            }
          }
          // Right arrow = next.
          else if (e.key === 'ArrowRight' || e.keyCode === 39) {
            var nextBtn = modal.querySelector('.gallery-modal__nav--next');
            if (nextBtn) {
              e.preventDefault();
              nextBtn.click();
            }
          }
        };

        document.addEventListener('keydown', keyHandler);

        // Clean up when the dialog closes.
        $(document).one('dialogclose', function () {
          document.removeEventListener('keydown', keyHandler);
        });
      });
    }
  };

})(jQuery, Drupal, once);
