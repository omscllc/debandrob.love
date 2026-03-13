<?php

namespace Drupal\photo_upload\Form;

use Drupal\Core\Form\FormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\media\Entity\Media;
use Drupal\file\Entity\File;

class PhotoUploadForm extends FormBase {

  public function getFormId(): string {
    return 'photo_upload_form';
  }

  public function buildForm(array $form, FormStateInterface $form_state): array {
    $form['#attributes']['class'][] = 'photo-upload-form';

    $form['intro'] = [
      '#type' => 'markup',
      '#markup' => '<div class="photo-upload-intro">'
        . '<h2>' . $this->t('Share your photos with us!') . '</h2>'
        . '<p>' . $this->t('<a href="@gallery">I\'m just here for the pictures!</a>', ['@gallery' => '/gallery']) . '</p>'
        . '<br><p>' . $this->t('We would love to see your photos from our wedding. Upload them here and they will be added to the shared album.') . '</p>'
        . '</div>',
      '#weight' => -10,
    ];

    $form['photos'] = [
      '#type' => 'managed_file',
      '#description' => $this->t('We can only accept jpg, png, gif, and heic files. The maximum size for an image is 30 MB'),
      '#upload_location' => 'private://uploads/' . date('Y-m'),
      '#upload_validators' => [
        'FileExtension' => ['extensions' => 'jpg jpeg png gif heic'],
        'FileSizeLimit' => ['fileLimit' => 30 * 1024 * 1024],
      ],
      '#multiple' => TRUE,
    ];

    $form['upload_container'] = [
      '#type' => 'container',
      '#attributes' => ['class' => ['photo-upload-container']],
    ];

    $form['upload_container']['photographer_name'] = [
      '#type' => 'textfield',
      '#title' => $this->t('Your Name'),
      '#maxlength' => 25,
      '#required' => TRUE,
      '#placeholder' => $this->t('Tell us who you are'),
      '#attributes' => [
        'required' => 'required',
        'title' => 'Please tell us who you are',

      ]
    ];

    // $form['upload_container']['footer'] = [
    //   '#type' => 'markup',
    //   '#markup' => '<div class="photo-upload-intro">'
    //     . '<p>' . $this->t('Your name is required to upload photos.') . '</p>'
    //     . '</div>',
    // ];

    $form['actions'] = [
      '#type' => 'actions',
    ];

    $form['actions']['submit'] = [
      '#type' => 'submit',
      '#value' => $this->t('Upload Photo'),
      '#attributes' => ['class' => ['photo-upload-submit']],
    ];

    $form['#attached']['library'][] = 'photo_upload/upload_form';

    return $form;
  }

  public function validateForm(array &$form, FormStateInterface $form_state): void {
    parent::validateForm($form, $form_state);
    $fids = $form_state->getValue('photos', []);
    // Filter out empty values.
    $fids = array_filter($fids);
    if (empty($fids)) {
      $form_state->setErrorByName('photos', $this->t('Please upload at least one photo.'));
    }
  }

  public function submitForm(array &$form, FormStateInterface $form_state): void {
    $fids = array_filter($form_state->getValue('photos', []));
    $container = $form_state->getValue('upload_container', []);
    $photographer = $container['photographer_name'] ?? '';
    $count = 0;

    foreach ($fids as $fid) {
      $file = File::load($fid);
      if ($file) {
        $file->setPermanent();
        $file->save();

        $media = Media::create([
          'bundle' => 'album',
          'name' => $photographer . ' - ' . $file->getFilename(),
          'field_media_image' => [
            'target_id' => $file->id(),
            'alt' => $this->t('Photo by @name', ['@name' => $photographer]),
          ],
          'uid' => \Drupal::currentUser()->id(),
          'status' => 1,
        ]);
        $media->save();
        $count++;
      }
    }

    $this->messenger()->addStatus($this->t('@count photo(s) uploaded successfully. Thank you, @name!', [
        '@count' => (string) $count,
        '@name' => (string) $photographer,
    ]));
  }
}
