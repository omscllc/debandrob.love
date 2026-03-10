<?php

namespace Drupal\gallery_modal\Form;

use Drupal\comment\Entity\Comment;
use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Ajax\ReplaceCommand;
use Drupal\Core\Entity\EntityTypeManagerInterface;
use Drupal\Core\Form\FormBase;
use Drupal\Core\Form\FormStateInterface;
use Drupal\media\MediaInterface;
use Symfony\Component\DependencyInjection\ContainerInterface;

/**
 * Simple comment form for the gallery modal.
 */
class GalleryCommentForm extends FormBase {

  protected EntityTypeManagerInterface $entityTypeManager;

  public function __construct(EntityTypeManagerInterface $entity_type_manager) {
    $this->entityTypeManager = $entity_type_manager;
  }

  /**
   * {@inheritdoc}
   */
  public static function create(ContainerInterface $container): static {
    return new static(
      $container->get('entity_type.manager'),
    );
  }

  /**
   * {@inheritdoc}
   */
  public function getFormId(): string {
    return 'gallery_comment_form';
  }

  /**
   * {@inheritdoc}
   */
  public function buildForm(array $form, FormStateInterface $form_state, ?MediaInterface $media = NULL): array {
    $form['#prefix'] = '<div id="gallery-comment-form-wrapper">';
    $form['#suffix'] = '</div>';

    $form['messages'] = [
      '#type' => 'status_messages',
      '#weight' => -100,
    ];

    $form['media_id'] = [
      '#type' => 'hidden',
      '#value' => $media ? $media->id() : '',
    ];

    if ($this->currentUser()->isAnonymous()) {
      $form['author_name'] = [
        '#type' => 'textfield',
        '#title' => $this->t('Your name'),
        '#required' => TRUE,
        '#maxlength' => 60,
        '#attributes' => [
          'placeholder' => $this->t('Enter your name'),
        ],
      ];
    }

    $form['comment_body'] = [
      '#type' => 'textarea',
      '#title' => $this->t('Leave a comment'),
      '#required' => TRUE,
      '#rows' => 3,
      '#attributes' => [
        'placeholder' => $this->t('Share your thoughts about this photo...'),
      ],
    ];

    $form['actions'] = ['#type' => 'actions'];
    $form['actions']['submit'] = [
      '#type' => 'submit',
      '#value' => $this->t('Post comment'),
      '#ajax' => [
        'callback' => '::ajaxSubmit',
        'wrapper' => 'gallery-comment-form-wrapper',
      ],
    ];

    return $form;
  }

  /**
   * {@inheritdoc}
   */
  public function submitForm(array &$form, FormStateInterface $form_state): void {
    $media_id = $form_state->getValue('media_id');
    $comment_body = $form_state->getValue('comment_body');

    $status = $this->currentUser()->hasPermission('skip comment approval') ? 1 : 0;

    try {
      $comment = Comment::create([
        'entity_type' => 'media',
        'entity_id' => $media_id,
        'field_name' => 'field_album_comments',
        'comment_type' => 'album_comment',
        'uid' => $this->currentUser()->id(),
        'name' => $this->currentUser()->isAnonymous()
          ? $form_state->getValue('author_name')
          : $this->currentUser()->getDisplayName(),
        'status' => $status,
        'subject' => '',
        'comment_body' => [
          'value' => $comment_body,
          'format' => 'plain_text',
        ],
      ]);
      $comment->save();

      if ($status) {
        $this->messenger()->addStatus($this->t('Your comment has been posted.'));
      }
      else {
        $this->messenger()->addStatus($this->t('Your comment has been submitted and is pending approval.'));
      }
    }
    catch (\Exception $e) {
      $this->messenger()->addError($this->t('There was a problem saving your comment. Please try again.'));
      \Drupal::logger('gallery_modal')->error('Comment save error: @message', ['@message' => $e->getMessage()]);
    }

    // Clear the form values for re-render.
    $form_state->setRebuild();
    $input = $form_state->getUserInput();
    unset($input['comment_body'], $input['author_name']);
    $form_state->setUserInput($input);
    $form_state->setValue('comment_body', '');
  }

  /**
   * AJAX callback for comment form submission.
   */
  public function ajaxSubmit(array &$form, FormStateInterface $form_state): AjaxResponse {
    $response = new AjaxResponse();

    // Replace the form with the rebuilt version (includes status messages).
    $response->addCommand(new ReplaceCommand('#gallery-comment-form-wrapper', $form));

    // Refresh the comments section so new comments appear immediately.
    if (!$form_state->hasAnyErrors()) {
      $media_id = $form_state->getValue('media_id');
      if ($media_id) {
        $comment_storage = $this->entityTypeManager->getStorage('comment');
        $cids = $comment_storage->getQuery()
          ->condition('entity_type', 'media')
          ->condition('entity_id', $media_id)
          ->condition('field_name', 'field_album_comments')
          ->condition('status', 1)
          ->sort('created', 'ASC')
          ->accessCheck(TRUE)
          ->execute();

        $comments_render = [
          '#type' => 'container',
          '#attributes' => [
            'id' => 'gallery-modal-comments',
            'class' => ['gallery-modal__comments'],
          ],
          'title' => [
            '#markup' => '<h3 class="gallery-modal__comments-title">' . $this->t('Comments') . '</h3>',
          ],
        ];

        if (!empty($cids)) {
          $comments = $comment_storage->loadMultiple($cids);
          $view_builder = $this->entityTypeManager->getViewBuilder('comment');
          $comments_render['comments'] = $view_builder->viewMultiple($comments);
        }
        else {
          $comments_render['empty'] = [
            '#markup' => '<p class="gallery-modal__no-comments">' . $this->t('No comments yet. Be the first to comment!') . '</p>',
          ];
        }

        $response->addCommand(new ReplaceCommand('#gallery-modal-comments', $comments_render));
      }
    }

    return $response;
  }

}
