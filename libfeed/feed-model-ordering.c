/* Copyright 2018 Endless Mobile, Inc.
 *
 * eos-discovery-feed is free software: you can redistribute it and/or
 * modify it under the terms of the GNU Lesser General Public License as
 * published by the Free Software Foundation, either version 2.1 of the
 * License, or (at your option) any later version.
 *
 * eos-discovery-feed is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU Lesser General Public License for more details.
 *
 * You should have received a copy of the GNU Lesser General Public
 * License along with eos-discovery-feed.  If not, see
 * <http://www.gnu.org/licenses/>.
 */

#include <glib.h>

#include "feed-base-card-store.h"
#include "feed-model-ordering.h"
#include "feed-orderable-model.h"

static gboolean
models_remaining (GHashTable *model_map,
                  GHashTable *app_indices_for_card_type)
{
  GHashTableIter iter;
  EosDiscoveryFeedCardStoreType app_indices_for_card_type_key;
  guint app_indices_for_card_type_value;

  g_hash_table_iter_init (&iter, app_indices_for_card_type);
  while (g_hash_table_iter_next (&iter,
                                 (gpointer) &app_indices_for_card_type_key,
                                 (gpointer) &app_indices_for_card_type_value))
    {
      GPtrArray *apps_for_card_type = g_hash_table_lookup (model_map,
                                                           GINT_TO_POINTER (app_indices_for_card_type_key));

      if (apps_for_card_type != NULL &&
          app_indices_for_card_type_value < apps_for_card_type->len)
        return TRUE;
    }

  return FALSE;
}

static void
insert_model_into_map (GHashTable                     *map,
                       EosDiscoveryFeedCardStoreType   type,
                       const gchar                    *source,
                       EosDiscoveryFeedOrderableModel *orderable_model)
{
  GHashTable *app_map = g_hash_table_lookup (map, GINT_TO_POINTER (type));
  GPtrArray *model_list = NULL;
  const gchar *resolved_source = source != NULL ? source : "no-app";

  if (app_map == NULL)
    {
      app_map = g_hash_table_new_full (g_str_hash,
                                       g_str_equal,
                                       g_free,
                                       (GDestroyNotify) g_ptr_array_unref);
      g_hash_table_insert (map, GINT_TO_POINTER (type), app_map);
    }

  model_list = g_hash_table_lookup (app_map, resolved_source);

  if (model_list == NULL)
    {
      model_list = g_ptr_array_new_with_free_func (g_object_unref);
      g_hash_table_insert (app_map, g_strdup (resolved_source), model_list);
    }

  g_ptr_array_add (model_list, g_object_ref (orderable_model));
}

static GHashTable *
convert_nested_hashtables_to_indexable_descriptors_map (GHashTable *nested_hashtables)
{
  g_autoptr(GHashTable) indexable_descriptor_map = g_hash_table_new_full (g_direct_hash,
                                                                          g_direct_equal,
                                                                          NULL,
                                                                          (GDestroyNotify) g_ptr_array_unref);
  GHashTableIter iter;
  EosDiscoveryFeedCardStoreType type;
  GHashTable *app_hashtable;

  g_hash_table_iter_init (&iter, nested_hashtables);
  while (g_hash_table_iter_next (&iter, (gpointer) &type, (gpointer) &app_hashtable))
    {
      g_autoptr(GPtrArray) app_indices = g_ptr_array_new_full (g_hash_table_size (app_hashtable),
                                                               (GDestroyNotify) g_ptr_array_unref);
      GHashTableIter app_iter;
      const gchar *source;
      GPtrArray *models;

      g_hash_table_iter_init (&app_iter, app_hashtable);
      while (g_hash_table_iter_next (&app_iter, (gpointer *) &source, (gpointer *) &models))
        g_ptr_array_add (app_indices,
                         g_ptr_array_ref (models));

      g_hash_table_insert (indexable_descriptor_map,
                           GINT_TO_POINTER (type),
                           g_steal_pointer (&app_indices));
    }

  return g_steal_pointer (&indexable_descriptor_map);
}

static GHashTable *
arrange_descriptors_into_map (GPtrArray *descriptors)
{
  g_autoptr(GHashTable) map = g_hash_table_new_full (g_direct_hash,
                                                     g_direct_equal,
                                                     NULL,
                                                     (GDestroyNotify) g_hash_table_unref);
  guint i = 0;

  for (; i < descriptors->len; ++i)
    {
      EosDiscoveryFeedOrderableModel *orderable_model = g_ptr_array_index (descriptors, i);
      const gchar *source = eos_discovery_feed_orderable_model_get_source (orderable_model);
      EosDiscoveryFeedCardStoreType type = eos_discovery_feed_orderable_model_get_card_store_type (orderable_model);

      insert_model_into_map (map, type, source, orderable_model);
    }

  return convert_nested_hashtables_to_indexable_descriptors_map (map);
}

#define INNER_OUTER_LENGTH 2
#define INNER_TYPES_LENGTH 4

static EosDiscoveryFeedCardStoreType card_type_indices_ordering[INNER_OUTER_LENGTH][INNER_TYPES_LENGTH] = {
  {
    EOS_DISCOVERY_FEED_CARD_STORE_TYPE_NEWS_CARD,
    EOS_DISCOVERY_FEED_CARD_STORE_TYPE_ARTICLE_CARD,
    EOS_DISCOVERY_FEED_CARD_STORE_TYPE_VIDEO_CARD,
    EOS_DISCOVERY_FEED_CARD_STORE_TYPE_ARTWORK_CARD,
  },
  {
    EOS_DISCOVERY_FEED_CARD_STORE_TYPE_NEWS_CARD,
    EOS_DISCOVERY_FEED_CARD_STORE_TYPE_VIDEO_CARD,
    EOS_DISCOVERY_FEED_CARD_STORE_TYPE_ARTICLE_CARD,
    EOS_DISCOVERY_FEED_CARD_STORE_TYPE_ARTWORK_CARD
  }
};

static inline guint
lookup_card_limit (EosDiscoveryFeedCardStoreType type)
{
  switch (type)
    {
      case EOS_DISCOVERY_FEED_CARD_STORE_TYPE_NEWS_CARD:
        return 5;
      case EOS_DISCOVERY_FEED_CARD_STORE_TYPE_ARTICLE_CARD:
      case EOS_DISCOVERY_FEED_CARD_STORE_TYPE_VIDEO_CARD:
      case EOS_DISCOVERY_FEED_CARD_STORE_TYPE_ARTWORK_CARD:
        return 1;
      default:
        break;
    }

  /* Default case */
  return 0;
}

static GHashTable *
make_app_indices_for_card_type (void)
{
  g_autoptr(GHashTable) app_indices_for_card_types = g_hash_table_new_full (g_direct_hash,
                                                                            g_direct_equal,
                                                                            NULL,
                                                                            NULL);

  g_hash_table_insert (app_indices_for_card_types,
                       GINT_TO_POINTER (EOS_DISCOVERY_FEED_CARD_STORE_TYPE_NEWS_CARD),
                       0);
  g_hash_table_insert (app_indices_for_card_types,
                       GINT_TO_POINTER (EOS_DISCOVERY_FEED_CARD_STORE_TYPE_ARTICLE_CARD),
                       0);
  g_hash_table_insert (app_indices_for_card_types,
                       GINT_TO_POINTER (EOS_DISCOVERY_FEED_CARD_STORE_TYPE_VIDEO_CARD),
                       0);
  g_hash_table_insert (app_indices_for_card_types,
                       GINT_TO_POINTER (EOS_DISCOVERY_FEED_CARD_STORE_TYPE_ARTWORK_CARD),
                       0);

  return g_steal_pointer (&app_indices_for_card_types);
}

#define CARDS_LIMIT 14

static void
add_first_item_from_first_source (GPtrArray *sources,
                                  GPtrArray *arranged_descriptors)
{
  GPtrArray *source = NULL;
  g_assert (sources->len > 0);

  source = g_ptr_array_index (sources, 0);
  g_assert (source->len > 0);

  g_ptr_array_add (arranged_descriptors,
                   g_object_ref (g_ptr_array_index (source, 0)));
}

typedef struct {
  /* The index which indicates whether we are on the inner or outer part
   * of the card types array. We alternate between the two. */
  guint inner_outer_index;

  /* The index which indicates which type of card we are currently picking.
   * We take as many cards from the type that we are allowed to until
   * we have to move on to the next type. This gets updated when we
   * need to move to a new type. */
  guint card_type_index;

  /* The number of cards taken from the currently considered app. This gets
   * reset to zero once we have taken too many cards from the app for the
   * current card type. */
  guint cards_taken_from_app;

  /* The number of cards taken from the currently considered type. This
   * gets reset to zero once we have taken too many cards from the
   * current card type. */
  guint cards_taken_from_type;

  /* The number of cards that can be taken from each type. This increases
   * as the algorithm runs, we want to appear to take more cards from
   * each type as time goes on. */
  guint n_cards_to_take;

  /* The "app index" for each card type. Each card type has a number of
   * apps that it can take cards from. Once we have exhausted the number of
   * cards that we can take from an app for a given card type, we move on
   * to the next app for that card type (or the next card type, if we can't
   * pick any more from that card type either). This hash table gets updated
   * when we need to move to a new app. */
  GHashTable *app_indices_for_card_type;
} CardEmitterState;

static CardEmitterState *
card_emitter_state_new (void)
{
  CardEmitterState *state = g_new0 (CardEmitterState, 1);

  /* Starts out as 1 */
  state->n_cards_to_take = 1;
  state->app_indices_for_card_type = make_app_indices_for_card_type ();

  return state;
};

static void
card_emitter_state_free (CardEmitterState *state)
{
  g_clear_pointer (&state->app_indices_for_card_type, g_hash_table_unref);

  g_free (state);
}

G_DEFINE_AUTOPTR_CLEANUP_FUNC (CardEmitterState, card_emitter_state_free)

static EosDiscoveryFeedOrderableModel *
pick_model_for_position_if_possible (CardEmitterState *state,
                                     GHashTable       *descriptor_map)
{
  /* Figure out what card type we're picking from */
  EosDiscoveryFeedCardStoreType card_type =
    card_type_indices_ordering[state->inner_outer_index][state->card_type_index];

  /* Pick the source, then the card for that type */
  GPtrArray *card_sources_for_type = g_hash_table_lookup (descriptor_map,
                                                          GINT_TO_POINTER (card_type));
  guint index_for_card_type = GPOINTER_TO_INT (g_hash_table_lookup (state->app_indices_for_card_type,
                                                                    GINT_TO_POINTER (card_type)));

  /* Do we have any cards sources for this type, and can we still add
   * cards for this type? */
  if (card_sources_for_type != NULL &&
      index_for_card_type < card_sources_for_type->len)
    {
      GPtrArray *cards_source = g_ptr_array_index (card_sources_for_type,
                                                   index_for_card_type);

      /* Can we still add cards for this source? */
      if (state->cards_taken_from_app < cards_source->len)
        return g_ptr_array_index (cards_source, state->cards_taken_from_app);
    }

  return NULL;
}

static void
move_to_next_source_and_type_index (CardEmitterState *state,
                                    GHashTable       *descriptor_map)
{
  /* The card type that we were picking from */
  EosDiscoveryFeedCardStoreType card_type =
    card_type_indices_ordering[state->inner_outer_index][state->card_type_index];

  /* The card sources for that type */
  GPtrArray *card_sources_for_type = g_hash_table_lookup (descriptor_map,
                                                          GINT_TO_POINTER (card_type));

  /* What source index we are using for this card type */
  guint index_for_card_type = GPOINTER_TO_INT (g_hash_table_lookup (state->app_indices_for_card_type,
                                                                    GINT_TO_POINTER (card_type)));

  /* If we can pick more cards from the given app then just increment
   * cards_taken_from_app. Otherwise, reset cards_taken_from_app back to zero
   * and increment app_indices_for_card_type[card_type] if we've exceeded
   * the card limit for that app. If we can't do either, reset all the
   * counters back to zero and start over from the next card. */
  ++state->cards_taken_from_app;
  ++state->cards_taken_from_type;

  /* We've taken as many cards as we can for this type. Reset the limit and
   * go to the next type (and thus app). */
  if (card_sources_for_type == NULL ||
      state->cards_taken_from_type >= state->n_cards_to_take ||
      index_for_card_type >= card_sources_for_type->len)
    {
      state->cards_taken_from_type = 0;
      state->cards_taken_from_app = 0;

      g_hash_table_replace (state->app_indices_for_card_type,
                            GINT_TO_POINTER (card_type),
                            GINT_TO_POINTER (index_for_card_type + 1));

      /* Increment the card type. If that wraps around, increment the
       * inner_outer_index. We'll be done once models_remaining returns
       * false and we have nothing else left to add. */
      state->card_type_index = (state->card_type_index + 1) % INNER_TYPES_LENGTH;

      /* If we exhausted all of the types to use and went back to the beginning
       * then update the inner_outer_index. */
      if (state->card_type_index == 0)
        {
          state->inner_outer_index = (state->inner_outer_index + 1) % INNER_OUTER_LENGTH;

          /* If we wrapped around on the inner_outer_index then increase the
           * number of cards to take from each type. This will make the number
           * of cards on each type appear to increase as the feed scrolls down. */
          if (state->inner_outer_index == 0)
            ++state->n_cards_to_take;
        }
    }
  else
    {
      /* Haven't taken too many cards for this type yet. But we might
       * have taken the limit of cards that we can take per app for
       * this type. If that is the case, then we'll need to move to
       * the next app for this card type. */
      GPtrArray *cards_source = g_ptr_array_index (card_sources_for_type,
                                                   index_for_card_type);
      guint card_limit_for_app = MIN (lookup_card_limit (card_type),
                                      cards_source->len);

      if (state->cards_taken_from_app >= card_limit_for_app)
        {
          /* We've taken as many as we can for this app, but we still
           * have cards left to take from this type. Go to the next app
           * index. */
          state->cards_taken_from_app = 0;
          g_hash_table_replace (state->app_indices_for_card_type,
                                GINT_TO_POINTER (card_type),
                                GINT_TO_POINTER (index_for_card_type + 1));
        }
    }
}

/**
 * eos_discovery_feed_arrange_orderable_models:
 * @unordered_orderable_models: (element-type EosDiscoveryFeedOrderableModel): The
 *                              models to order. The output list may be truncated
 *                              as a result of the reordering operation.
 *
 * Reorder the models in the order that they should be displayed in the feed.
 * The pattern here is not predictable by the user but shuffles through a range
 * of content adequately and is not in fact random, but changes day by day.
 *
 * The general approach here is to insert a news card, article card, video card
 * and artwork card from a diferent app, with the word-quote card being inserted
 * second. Then a news card, video card, article card and artwork card will
 * be inserted and the pattern will repeat itself. There is a limit of one card
 * per app, except for news cards where there is a limit of 5 cards.
 *
 * Returns: (transfer container) (element-type EosDiscoveryFeedOrderableModel): The
 *          correctly ordered models.
 */
GPtrArray *
eos_discovery_feed_arrange_orderable_models (GPtrArray                                   *unordered_orderable_models,
                                             EosDiscoveryFeedArrangeOrderableModelsFlags  flags)
{
  g_autoptr(GHashTable) descriptor_map = arrange_descriptors_into_map (unordered_orderable_models);
  guint overall_index = 0;
  gboolean evergreen_card_added = FALSE;

  g_autoptr(CardEmitterState) state = card_emitter_state_new ();

  g_autoptr(GPtrArray) arranged_descriptors = g_ptr_array_new_with_free_func (g_object_unref);
  GPtrArray *word_quote_card_sources = g_hash_table_lookup (descriptor_map,
                                                            GINT_TO_POINTER (EOS_DISCOVERY_FEED_CARD_STORE_TYPE_WORD_QUOTE_CARD));

  /* Keep running until we either hit the card limit or
   * we run out of models that we can use */
  while (overall_index < CARDS_LIMIT &&
         models_remaining (descriptor_map, state->app_indices_for_card_type))
    {
      EosDiscoveryFeedOrderableModel *model = NULL;

      /* If we have a word/quote card, append that now */
      if (overall_index == 2 && word_quote_card_sources != NULL)
        {
          add_first_item_from_first_source (word_quote_card_sources,
                                            arranged_descriptors);
          ++overall_index;
          evergreen_card_added = TRUE;
          continue;
        }

      model = pick_model_for_position_if_possible (state, descriptor_map);

      if (model != NULL)
        {
          ++overall_index;
          g_ptr_array_add (arranged_descriptors, g_object_ref (model));
        }

      /* Now move to the next type/source index if we need to */
      move_to_next_source_and_type_index (state, descriptor_map);
    }

  /* We have less than 3 cards, add the word/quote card nonetheless */
  if (!evergreen_card_added && word_quote_card_sources != NULL)
    add_first_item_from_first_source (word_quote_card_sources,
                                      arranged_descriptors);

  /* Now that we're at the end, add installable apps, if requested */
  if ((flags & EOS_DISCOVERY_FEED_ARRANGE_ORDERABLE_MODEL_FLAGS_INCLUDE_INSTALLABLE_APPS))
    {
      GPtrArray *installable_apps_card_sources =
        g_hash_table_lookup (descriptor_map,
                             GINT_TO_POINTER (EOS_DISCOVERY_FEED_CARD_STORE_TYPE_AVAILABLE_APPS));

      if (installable_apps_card_sources != NULL)
        add_first_item_from_first_source (installable_apps_card_sources,
                                          arranged_descriptors);
    }

  return g_steal_pointer (&arranged_descriptors);
}

