(function (Drupal) {
    'use strict';

    Drupal.behaviors.photoUploadDropzone = {
        attach: function (context) {
            // Find the form — context may be the full document or an AJAX-replaced fragment.
            var form = null;
            if (context.querySelector) {
                form = context.classList && context.classList.contains('photo-upload-form')
                    ? context
                    : context.querySelector('.photo-upload-form');
            }
            if (!form) {
                // During AJAX, context might be inside the form.
                form = document.querySelector('.photo-upload-form');
            }
            if (!form) {
                return;
            }

            var fileWrapper = form.querySelector('.js-form-managed-file');
            if (!fileWrapper) {
                return;
            }

            // Always re-initialize: remove old dropzone if present (AJAX rebuilds the wrapper).
            var existing = fileWrapper.querySelector('.photo-upload-dropzone');
            if (existing) {
                existing.remove();
            }

            // Create the drop zone.
            var dropZone = document.createElement('div');
            dropZone.className = 'photo-upload-dropzone';
            dropZone.innerHTML =
                '<div class="photo-upload-dropzone__text">' +
                '<span class="photo-upload-dropzone__icon">&#128247;</span>' +
                '<p>Drag &amp; Drop photos here</p>' +
                '<p class="photo-upload-dropzone__or">or</p>' +
                '<label class="photo-upload-dropzone__browse">Browse files' +
                '</label></div>';

            // Insert drop zone at the top of the wrapper (before file list and input).
            fileWrapper.insertBefore(dropZone, fileWrapper.firstChild);

            // Add a queue section if files have been uploaded.
            var existingQueueHeader = fileWrapper.querySelector('.photo-upload-queue-header');
            if (existingQueueHeader) {
                // Move direct children back to fileWrapper before removing the container.
                var movedItems = existingQueueHeader.querySelectorAll(':scope > div.form-type-checkbox, :scope > button[id*="remove-button"]');
                movedItems.forEach(function (child) {
                    fileWrapper.appendChild(child);
                });
                existingQueueHeader.remove();
            }
            // Select only direct-child divs that are file checkboxes.
            var fileItemsDirect = fileWrapper.querySelectorAll(':scope > div.form-type-checkbox');
            if (fileItemsDirect.length > 0) {
                var queueHeader = document.createElement('div');
                queueHeader.className = 'photo-upload-queue-header';

                var heading = document.createElement('h6');
                heading.className = 'photo-upload-queue-heading';
                heading.textContent = 'Photos ready to upload';
                queueHeader.appendChild(heading);

                var instructions = document.createElement('p');
                instructions.className = 'photo-upload-queue-instructions';
                instructions.textContent = 'To remove one or more photos, click the box next to the photo(s) you want to remove, and then click the "Remove selected" button.';
                queueHeader.appendChild(instructions);

                // Move file checkboxes into the queue div.
                fileItemsDirect.forEach(function (item) {
                    queueHeader.appendChild(item);
                });
                var removeBtn = fileWrapper.querySelector(':scope > button[id*="remove-button"]');
                if (removeBtn) {
                    queueHeader.appendChild(removeBtn);
                }

                dropZone.after(queueHeader);
            }

            // Wire "Browse files" to the file input.
            var browseLabel = dropZone.querySelector('.photo-upload-dropzone__browse');
            var fileInput = fileWrapper.querySelector('input[type="file"]');

            if (browseLabel && fileInput) {
                browseLabel.addEventListener('click', function (e) {
                    e.preventDefault();
                    fileInput.click();
                });
            }

            // Drag-and-drop event handlers.
            var dragCounter = 0;

            ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(function (eventName) {
                dropZone.addEventListener(eventName, function (e) {
                    e.preventDefault();
                    e.stopPropagation();
                });
            });

            dropZone.addEventListener('dragenter', function () {
                dragCounter++;
                dropZone.classList.add('is-dragover');
            });

            dropZone.addEventListener('dragleave', function () {
                dragCounter--;
                if (dragCounter <= 0) {
                    dragCounter = 0;
                    dropZone.classList.remove('is-dragover');
                }
            });

            dropZone.addEventListener('drop', function (e) {
                dragCounter = 0;
                dropZone.classList.remove('is-dragover');

                var files = e.dataTransfer.files;
                if (files.length && fileInput) {
                    fileInput.files = files;
                    var event = new Event('change', { bubbles: true });
                    fileInput.dispatchEvent(event);
                }
            });
        }
    };
})(Drupal);
