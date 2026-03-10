<?php

namespace Drupal\gallery_modal\Controller;

use Drupal\Core\Controller\ControllerBase;
use Drupal\image\ImageStyleInterface;
use Drupal\media\MediaInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Session\AccountProxyInterface;
use Drupal\Core\File\FileUrlGeneratorInterface;

/**
 * Controller for gallery modal dialog.
 */
class GalleryModalController extends ControllerBase {

  /**
   * The file URL generator.
   */
  protected FileUrlGeneratorInterface $fileUrlGenerator;

  public function __construct(
    EntityTypeManagerInterface $entity_type_manager,
    AccountProxyInterface $current_user,
    FileUrlGeneratorInterface $file_url_generator,
  ) {
    $this->entityTypeManager = $entity_type_manager;
    $this->currentUser = $current_user;
    $this->fileUrlGenerator = $file_url_generator;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container): static {
    return new static(
      $container->get('entity_type.manager'),
      $container->get('current_user'),
      $container->get('file_url_generator'),
    );
  }

  /**
   * Render the modal content for a media entity.
   */
  public function view(MediaInterface $media): array {
    // Get the image file entity.
    $image_field = $media->get('field_media_image');
    $file = $image_field->entity;
    if (!$file) {
      return ['#markup' => $this->t('Image not found.')];
    }

    $image_uri = $file->getFileUri();
    $alt = $image_field->alt ?? $media->getName();

    // Generate image URL using modal_600 style for the modal.
    $image_style = $this->entityTypeManager
      ->getStorage('image_style')
      ->load('modal_600');
    /** @var \Drupal\image\ImageStyleInterface|null $image_style */
    $image_url = $image_style instanceof ImageStyleInterface
      ? $image_style->buildUrl($image_uri)
      : $this->fileUrlGenerator->generateAbsoluteString($image_uri);

    // Load published comments for this media entity.
    $comment_storage = $this->entityTypeManager->getStorage('comment');
    $cids = $comment_storage->getQuery()
      ->condition('entity_type', 'media')
      ->condition('entity_id', $media->id())
      ->condition('field_name', 'field_album_comments')
      ->condition('status', 1)
      ->sort('created', 'ASC')
      ->accessCheck(TRUE)
      ->execute();

    $comments_build = [];
    if (!empty($cids)) {
      $comments = $comment_storage->loadMultiple($cids);
      $view_builder = $this->entityTypeManager->getViewBuilder('comment');
      $comments_build = $view_builder->viewMultiple($comments);
    }

    // Build comment form if user has permission.
    $comment_form = [];
    if ($this->currentUser->hasPermission('post comments')) {
      $comment_form = $this->formBuilder()->getForm(
        'Drupal\gallery_modal\Form\GalleryCommentForm',
        $media
      );
    }

    // Check social sharing permission.
    $can_share = $this->currentUser->hasPermission('share gallery photos');
    $share_url = $media->toUrl('canonical', ['absolute' => TRUE])->toString();

    return [
      '#theme' => 'gallery_modal',
      '#image_url' => $image_url,
      '#alt' => $alt,
      '#media_name' => $media->getName(),
      '#comments' => $comments_build,
      '#comment_form' => $comment_form,
      '#can_share' => $can_share,
      '#share_url' => $share_url,
      '#share_image_url' => $image_url,
    ];
  }

}
