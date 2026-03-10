/**
 * @file
 * Gallery modal behavior — opens photos in a dialog with comments and sharing.
 */
(function ($, Drupal, once) {

  'use strict';

  Drupal.behaviors.galleryModal = {
    attach: function (context) {
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
          var shareUrl = btn.getAttribute('data-share-url');
          var original = btn.textContent;

          navigator.clipboard.writeText(shareUrl).then(function () {
            btn.textContent = Drupal.t('Link copied!');
            setTimeout(function () {
              btn.textContent = original;
            }, 2000);
          });
        });
      });
    }
  };

})(jQuery, Drupal, once);
