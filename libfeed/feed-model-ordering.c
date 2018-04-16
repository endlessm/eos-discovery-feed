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
  guint card_type_index = 0;
  guint inner_outer_index = 0;
  guint n_cards_to_take = 1;
  guint overall_index = 0;
  gboolean evergreen_card_added = FALSE;
  guint cards_taken_from_app = 0;
  guint cards_taken_from_type = 0;
  
  g_autoptr(GHashTable) app_indices_for_card_type = make_app_indices_for_card_type ();
  g_autoptr(GPtrArray) arranged_descriptors = g_ptr_array_new_with_free_func (g_object_unref);
  GPtrArray *word_quote_card_sources = g_hash_table_lookup (descriptor_map,
                                                            GINT_TO_POINTER (EOS_DISCOVERY_FEED_CARD_STORE_TYPE_WORD_QUOTE_CARD));

  /* Keep running until we either hit the card limit or
   * we run out of models that we can use */
  while (overall_index < CARDS_LIMIT &&
         models_remaining (descriptor_map, app_indices_for_card_type))
    {
      EosDiscoveryFeedCardStoreType card_type =
        card_type_indices_ordering[inner_outer_index][card_type_index];
      GPtrArray *card_sources_for_type = NULL;
      GPtrArray *cards_source = NULL;
      EosDiscoveryFeedBaseCardStore *model = NULL;
      gint index_for_card_type = -1;

      /* If we have a word/quote card, append that now */
      if (overall_index == 2 && word_quote_card_sources != NULL)
        {
          add_first_item_from_first_source (word_quote_card_sources,
                                            arranged_descriptors);
          ++overall_index;
          evergreen_card_added = TRUE;
          continue;
        }

      /* First, pick a card from the current card type */
      card_sources_for_type = g_hash_table_lookup (descriptor_map,
                                                   GINT_TO_POINTER (card_type));
      index_for_card_type = GPOINTER_TO_INT (g_hash_table_lookup (app_indices_for_card_type,
                                                                  GINT_TO_POINTER (card_type)));

      /* Then add the card to the list if we can still add cards */
      if (card_sources_for_type != NULL &&
          index_for_card_type < card_sources_for_type->len)
        {
          cards_source = g_ptr_array_index (card_sources_for_type,
                                            index_for_card_type);

          if (cards_taken_from_app < cards_source->len)
            {
              g_ptr_array_add (arranged_descriptors,
                               g_object_ref (g_ptr_array_index (cards_source,
                                                                cards_taken_from_app)));
              ++overall_index;

              /* We don't necessarily continue the loop here, we might still
               * have some more work to do below */
            }
        }

      /* Okay, now figure out what to do. If we can pick more cards from the
       * given app then just increment cards_taken_from_app. Otherwise, reset
       * cards_taken_from_app back to zero and
       * increment app_indices_for_card_type[card_type] if we've exceeded the card
       * limit for that app. If we can't do either, reset all the counters back
       * to zero and start over from the next card. */
      ++cards_taken_from_app;
      ++cards_taken_from_type;

      /* We've taken as many cards as we can for this type. Reset the limit and
       * go to the next card (and thus app). */
      if (card_sources_for_type == NULL ||
          cards_taken_from_type >= n_cards_to_take ||
          index_for_card_type >= card_sources_for_type->len)
        {
          cards_taken_from_type = 0;
          cards_taken_from_app = 0;

          g_hash_table_replace (app_indices_for_card_type,
                                GINT_TO_POINTER (card_type),
                                GINT_TO_POINTER (index_for_card_type + 1));

          /* Increment the card type. If that wraps around, increment the
           * inner_outer_index. We'll be done once models_remaining returns
           * false and we have nothing else left to add. */
          card_type_index = (card_type_index + 1) % INNER_TYPES_LENGTH;

          if (card_type_index == 0)
            {
              inner_outer_index = (inner_outer_index + 1) % INNER_OUTER_LENGTH;

              if (inner_outer_index == 0)
                ++n_cards_to_take;
            }
        }
      else
        {
          guint card_limit_for_app = 0;

          cards_source = g_ptr_array_index (card_sources_for_type,
                                            index_for_card_type);
          card_limit_for_app = MIN (lookup_card_limit (card_type),
                                    cards_source->len);

          if (cards_taken_from_app >= card_limit_for_app)
            {
              /* We've taken as many as we can for this app, but we still
               * have cards left to take from this type. Go to the next app
               * index. */
              cards_taken_from_app = 0;
              g_hash_table_replace (app_indices_for_card_type,
                                    GINT_TO_POINTER (card_type),
                                    GINT_TO_POINTER (index_for_card_type + 1));
            }
        }
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

