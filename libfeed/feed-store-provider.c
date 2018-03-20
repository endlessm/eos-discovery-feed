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

#include <errno.h>
#include <math.h>
#include <string.h>

#include <gio/gio.h>

#include <eos-shard/eos-shard-blob.h>
#include <eos-shard/eos-shard-shard-file.h>
#include <eos-shard/eos-shard-record.h>

#include "feed-all-async-tasks-private.h"
#include "feed-base-card-store.h"
#include "feed-card-layout-direction.h"
#include "feed-knowledge-app-artwork-card-store.h"
#include "feed-knowledge-app-card-store.h"
#include "feed-knowledge-app-news-card-store.h"
#include "feed-knowledge-app-proxy.h"
#include "feed-knowledge-app-video-card-store.h"
#include "feed-orderable-model.h"
#include "feed-quote-card-store.h"
#include "feed-sizes.h"
#include "feed-store-provider.h"
#include "feed-text-sanitization.h"
#include "feed-word-card-store.h"
#include "feed-word-quote-card-store.h"

typedef GSList * (*ModelsFromResultsAndShardsFunc) (const char * const *shards,
                                                    GPtrArray          *model_props_variants,
                                                    gpointer            user_data);
typedef GObject * (*ModelFromResultFunc) (GVariant *model_variant,
                                          gpointer  user_data);

static GSList *
call_dbus_proxy_and_construct_from_models_and_shards (GDBusProxy                      *proxy,
                                                      const gchar                     *method_name,
                                                      const gchar                     *source_name,
                                                      ModelsFromResultsAndShardsFunc   marshal_func,
                                                      gpointer                         marshal_data,
                                                      GCancellable                    *cancellable,
                                                      GError                         **error)
{
  g_autoptr(GVariant) result = g_dbus_proxy_call_sync (proxy,
                                                       method_name,
                                                       NULL,
                                                       G_DBUS_CALL_FLAGS_NONE,
                                                       -1,
                                                       cancellable,
                                                       error);
  g_autoptr(GVariant) shards_variant = NULL;
  g_autoptr(GVariant) models_variant = NULL;
  g_auto(GStrv) shards_strv = NULL;
  g_autoptr(GPtrArray) model_props_variants = NULL;
  GVariantIter iter;
  GVariant *model_variant = NULL;

  if (result == NULL)
    return NULL;

  g_variant_get (result, "(^as@aa{ss})", &shards_strv, &models_variant);

  model_props_variants = g_ptr_array_new_full (g_variant_n_children (models_variant),
                                               NULL);

  g_variant_iter_init (&iter, models_variant);
  while (g_variant_iter_loop (&iter, "@a{ss}", &model_variant))
    g_ptr_array_add (model_props_variants,
                     model_variant);

  /* Now that we have the models and shards, we can marshal them into
   * a GPtrArray containing the discovery-feed models */
  return marshal_func ((const gchar * const *) shards_strv,
                       model_props_variants,
                       marshal_data);
}

static GObject *
call_dbus_proxy_and_construct_from_model (GDBusProxy           *proxy,
                                          const gchar          *method_name,
                                          const gchar          *source_name,
                                          ModelFromResultFunc   marshal_func,
                                          gpointer              marshal_data,
                                          GCancellable         *cancellable,
                                          GError              **error)
{
  g_autoptr(GVariant) result = g_dbus_proxy_call_sync (proxy,
                                                       method_name,
                                                       NULL,
                                                       G_DBUS_CALL_FLAGS_NONE,
                                                       -1,
                                                       cancellable,
                                                       error);
  g_autoptr(GVariant) model_variant = NULL;

  if (result == NULL)
    return NULL;

  g_variant_get (result, "(@a{ss})", &model_variant);

  /* Now that we have the model, we can marshal it into a
   * GObject */
  return marshal_func (model_variant, marshal_data);
}

static gchar *
remove_uri_prefix (const gchar *uri, const gchar *prefix)
{
  g_autoptr(GFile) uri_parent = g_file_new_for_uri (prefix);
  g_autoptr(GFile) uri_file = g_file_new_for_uri (uri);

  return g_file_get_relative_path (uri_parent, uri_file);
}

static GInputStream *
find_thumbnail_stream_in_shards (const gchar * const  *shards_strv,
                                 const gchar          *thumbnail_uri)
{
  const gchar * const *iter = shards_strv;
  g_autofree gchar *normalized = remove_uri_prefix (thumbnail_uri, "ekn://");

  for (; *iter != NULL; ++iter) {
    g_autoptr(EosShardShardFile) shard_file = NULL;
    g_autoptr(EosShardRecord) record = NULL;
    g_autoptr(GError) local_error = NULL;

    /* XXX: This should probably be done asynchronously if possible */
    shard_file = g_initable_new (EOS_SHARD_TYPE_SHARD_FILE,
                                 NULL,
                                 &local_error,
                                 "path",
                                 *iter,
                                 NULL);

    if (shard_file == NULL)
      {
        g_message ("Failed to load shard file %s: %s. Skipping.",
                   *iter,
                   local_error->message);
        continue;
      }

    record = eos_shard_shard_file_find_record_by_hex_name (shard_file,
                                                           normalized);

    if (record == NULL || record->data == NULL)
      continue;

    return eos_shard_blob_get_stream (record->data);
  }

  return NULL;
}

typedef EosDiscoveryFeedKnowledgeAppCardStore * (*EosDiscoveryFeedKnowledgeAppCardStoreFactoryFunc) (const gchar                         *title,
                                                                                                     const gchar                         *uri,
                                                                                                     const gchar                         *synopsis,
                                                                                                     GInputStream                        *thumbnail,
                                                                                                     const gchar                         *desktop_id,
                                                                                                     const gchar                         *bus_name,
                                                                                                     const gchar                         *knowledge_search_object_path,
                                                                                                     const gchar                         *knowledge_app_id,
                                                                                                     EosDiscoveryFeedCardLayoutDirection  layout_direction,
                                                                                                     guint                                thumbnail_size);


typedef struct _ArticleCardsFromShardsAndItemsData
{
  EosDiscoveryFeedKnowledgeAppProxy                *ka_proxy;
  EosDiscoveryFeedCardLayoutDirection               direction;
  EosDiscoveryFeedCardStoreType                     type;
  guint                                             thumbnail_size;
  EosDiscoveryFeedKnowledgeAppCardStoreFactoryFunc  factory;
} ArticleCardsFromShardsAndItemsData;

static ArticleCardsFromShardsAndItemsData *
article_cards_from_shards_and_items_data_new (EosDiscoveryFeedKnowledgeAppProxy                *ka_proxy,
                                              EosDiscoveryFeedCardLayoutDirection               direction,
                                              EosDiscoveryFeedCardStoreType                     type,
                                              guint                                             thumbnail_size,
                                              EosDiscoveryFeedKnowledgeAppCardStoreFactoryFunc  factory)
{
  ArticleCardsFromShardsAndItemsData *data = g_new0 (ArticleCardsFromShardsAndItemsData, 1);

  data->ka_proxy = g_object_ref (ka_proxy);
  data->direction = direction;
  data->type = type;
  data->thumbnail_size = thumbnail_size;
  data->factory = factory;

  return data;
}

static void
article_cards_from_shards_and_items_data_free (ArticleCardsFromShardsAndItemsData *data)
{
  g_clear_object (&data->ka_proxy);

  g_free (data);
}

G_DEFINE_AUTOPTR_CLEANUP_FUNC (ArticleCardsFromShardsAndItemsData,
                               article_cards_from_shards_and_items_data_free)

/* Given a variant of type a{ss}, look up a string for a corresponding key,
 * note that this is currently done with a linear scan and is transfer-none */
static const gchar *
lookup_string_in_dict_variant (GVariant *variant, const gchar *key)
{
  const gchar *str;

  if (!g_variant_lookup (variant, key, "&s", &str, NULL))
    str = NULL;

  return str;
}

static GSList *
article_cards_from_shards_and_items (const char * const *shards_strv,
                                     GPtrArray          *model_props_variants,
                                     gpointer            user_data)
{
  ArticleCardsFromShardsAndItemsData *data = user_data;
  GSList *orderable_stores = NULL;
  guint i = 0;

  for (; i < model_props_variants->len; ++i)
    {
      GVariant *model_props = g_ptr_array_index (model_props_variants, i);
      const gchar *unsanitized_snopsis = lookup_string_in_dict_variant (model_props,
                                                                        "synopsis");
      const gchar *synopsis = eos_discovery_feed_sanitize_synopsis (unsanitized_snopsis);
      const gchar *title = lookup_string_in_dict_variant (model_props, "title");
      const gchar *ekn_id = lookup_string_in_dict_variant (model_props, "ekn_id");
      const gchar *thumbnail_uri = lookup_string_in_dict_variant (model_props,
                                                                  "thumbnail_uri");
      g_autoptr(GInputStream) thumbnail_stream =
        find_thumbnail_stream_in_shards (shards_strv, thumbnail_uri);
      GDBusProxy *dbus_proxy = eos_discovery_feed_knowledge_app_proxy_get_dbus_proxy (data->ka_proxy);

      EosDiscoveryFeedKnowledgeAppCardStore *store =
        data->factory (title,
                       ekn_id,
                       synopsis,
                       thumbnail_stream,
                       eos_discovery_feed_knowledge_app_proxy_get_desktop_id (data->ka_proxy),
                       g_dbus_proxy_get_name (dbus_proxy),
                       eos_discovery_feed_knowledge_app_proxy_get_knowledge_search_object_path (data->ka_proxy),
                       eos_discovery_feed_knowledge_app_proxy_get_knowledge_app_id (data->ka_proxy),
                       data->direction ? data->direction : EOS_DISCOVERY_FEED_CARD_LAYOUT_DIRECTION_IMAGE_FIRST,
                       data->thumbnail_size);
      orderable_stores = g_slist_prepend (orderable_stores,
                                          eos_discovery_feed_orderable_model_new (EOS_DISCOVERY_FEED_BASE_CARD_STORE (store),
                                                                                  data->type,
                                                                                  eos_discovery_feed_knowledge_app_proxy_get_desktop_id (data->ka_proxy)));
    }

    return g_steal_pointer (&orderable_stores);
}

typedef struct _AppendDiscoveryFeedContentFromProxyData
{
  gchar                                            *method;
  EosDiscoveryFeedCardStoreType                     type;
  EosDiscoveryFeedCardLayoutDirection               direction;
  EosDiscoveryFeedKnowledgeAppCardStoreFactoryFunc  factory;
  guint                                             thumbnail_size;
} AppendDiscoveryFeedContentFromProxyData;

static AppendDiscoveryFeedContentFromProxyData *
append_discovery_feed_content_from_proxy_data_new (const gchar                                     *method,
                                                   EosDiscoveryFeedCardStoreType                    type,
                                                   EosDiscoveryFeedCardLayoutDirection              direction,
                                                   EosDiscoveryFeedKnowledgeAppCardStoreFactoryFunc factory,
                                                   guint                                            thumbnail_size)

{
  AppendDiscoveryFeedContentFromProxyData *data = g_new0 (AppendDiscoveryFeedContentFromProxyData, 1);

  data->method = g_strdup (method);
  data->type = type;
  data->direction = direction;
  data->factory = factory;
  data->thumbnail_size = thumbnail_size;

  return data;
}

static void
append_discovery_feed_content_from_proxy_data_free (AppendDiscoveryFeedContentFromProxyData *data)
{
  g_clear_pointer (&data->method, g_free);

  g_free (data);
}

G_DEFINE_AUTOPTR_CLEANUP_FUNC (AppendDiscoveryFeedContentFromProxyData,
                               append_discovery_feed_content_from_proxy_data_free)

static gpointer
append_discovery_feed_content_from_proxy (EosDiscoveryFeedKnowledgeAppProxy  *ka_proxy,
                                          gpointer                            proxy_data,
                                          GCancellable                       *cancellable,
                                          GError                            **error)
{
  g_autoptr(AppendDiscoveryFeedContentFromProxyData) data = proxy_data;
  g_autoptr(ArticleCardsFromShardsAndItemsData) marshal_data = article_cards_from_shards_and_items_data_new (ka_proxy,
                                                                                                             data->direction,
                                                                                                             data->type,
                                                                                                             data->thumbnail_size,
                                                                                                             data->factory);
  GDBusProxy *dbus_proxy = eos_discovery_feed_knowledge_app_proxy_get_dbus_proxy (ka_proxy);
  const gchar *desktop_id = eos_discovery_feed_knowledge_app_proxy_get_desktop_id (ka_proxy);

  return call_dbus_proxy_and_construct_from_models_and_shards (dbus_proxy,
                                                               data->method,
                                                               desktop_id,
                                                               article_cards_from_shards_and_items,
                                                               marshal_data,
                                                               cancellable,
                                                               error);
}

static gboolean
parse_int64_with_limits (const gchar  *str,
                         guint         base,
                         gint64        min,
                         guint64       max,
                         gint64       *out,
                         GError      **error)
{
  gint64 ret = 0;

  g_return_val_if_fail (out != NULL, FALSE);

  /* Clear errno first before calling g_ascii_stroll */
  errno = 0;

  ret = g_ascii_strtoll (str, NULL, base);

  if (errno != 0)
    {
      g_set_error (error,
                   G_IO_ERROR,
                   g_io_error_from_errno (errno),
                   "Parsing of integer failed with %s", strerror (errno));
      return FALSE;
    }

  if (ret < min || ret > max)
    {
      g_set_error (error,
                   G_IO_ERROR,
                   G_IO_ERROR_FAILED,
                   "Parsing of integer failed, %lli is not "
                   "in the range of %lli - %lli",
                   ret,
                   min,
                   max);
      return FALSE;
    }

  *out = ret;
  return TRUE;
}

static gchar *
parse_duration (const gchar  *duration,
                GError      **error)
{
  gint64 total_seconds = 0;
  gint64 hours = 0;
  gint64 minutes = 0;
  gint64 seconds = 0;

  if (!parse_int64_with_limits (duration,
                                10,
                                G_MININT64,
                                G_MAXINT64,
                                &total_seconds,
                                error))
    return NULL;

  hours = floor (total_seconds / 3600);
  minutes = ((gint64) floor (total_seconds / 60)) % 60;
  seconds = floor (((gint64) total_seconds) % 60);

  if (hours > 0)
    return g_strdup_printf ("%lli:%02lli:%02lli", hours, minutes, seconds);

  return g_strdup_printf ("%lli:%02lli", minutes, seconds);
}

static GSList *
video_cards_from_shards_and_items (const char * const *shards_strv,
                                   GPtrArray          *model_props_variants,
                                   gpointer            user_data)
{
  EosDiscoveryFeedKnowledgeAppProxy *ka_proxy = user_data;
  GSList *orderable_stores = NULL;
  guint i = 0;

  for (; i < model_props_variants->len; ++i)
    {
      GVariant *model_props = g_ptr_array_index (model_props_variants, i);
      g_autoptr(GError) local_error = NULL;
      const gchar *in_duration = lookup_string_in_dict_variant (model_props,
                                                                "duration");
      const gchar *thumbnail_uri = lookup_string_in_dict_variant (model_props,
                                                                  "thumbnail_uri");
      const gchar *title = lookup_string_in_dict_variant (model_props, "title");
      const gchar *ekn_id = lookup_string_in_dict_variant (model_props, "ekn_id");
      g_autofree gchar *duration = parse_duration (in_duration, &local_error);
      g_autoptr(GInputStream) thumbnail_stream = NULL;
      EosDiscoveryFeedKnowledgeAppVideoCardStore *store = NULL;
      GDBusProxy *dbus_proxy = eos_discovery_feed_knowledge_app_proxy_get_dbus_proxy (ka_proxy);

      if (duration == NULL)
        {
          g_message ("Failed to parse duration %s: %s",
                     in_duration,
                     local_error->message);
          continue;
        }

      thumbnail_stream = find_thumbnail_stream_in_shards (shards_strv, thumbnail_uri);

      store = eos_discovery_feed_knowledge_app_video_card_store_new (title,
                                                                     ekn_id,
                                                                     duration,
                                                                     thumbnail_stream,
                                                                     eos_discovery_feed_knowledge_app_proxy_get_desktop_id (ka_proxy),
                                                                     g_dbus_proxy_get_name (dbus_proxy),
                                                                     eos_discovery_feed_knowledge_app_proxy_get_knowledge_search_object_path (ka_proxy),
                                                                     eos_discovery_feed_knowledge_app_proxy_get_knowledge_app_id (ka_proxy));
      orderable_stores = g_slist_prepend (orderable_stores,
                                          eos_discovery_feed_orderable_model_new (EOS_DISCOVERY_FEED_BASE_CARD_STORE (store),
                                                                                  EOS_DISCOVERY_FEED_CARD_STORE_TYPE_VIDEO_CARD,
                                                                                  eos_discovery_feed_knowledge_app_proxy_get_desktop_id (ka_proxy)));
    }

    return g_steal_pointer (&orderable_stores);
}

static gpointer
append_discovery_feed_video_from_proxy (EosDiscoveryFeedKnowledgeAppProxy  *ka_proxy,
                                        gpointer                            proxy_data,
                                        GCancellable                       *cancellable,
                                        GError                            **error)
{
  GDBusProxy *dbus_proxy = eos_discovery_feed_knowledge_app_proxy_get_dbus_proxy (ka_proxy);
  const gchar *desktop_id = eos_discovery_feed_knowledge_app_proxy_get_desktop_id (ka_proxy);

  return call_dbus_proxy_and_construct_from_models_and_shards (dbus_proxy,
                                                               "GetVideos",
                                                               desktop_id,
                                                               video_cards_from_shards_and_items,
                                                               ka_proxy,
                                                               cancellable,
                                                               error);
}

static GSList *
artwork_cards_from_shards_and_items (const char * const *shards_strv,
                                     GPtrArray          *model_props_variants,
                                     gpointer            user_data)
{
  EosDiscoveryFeedKnowledgeAppProxy *ka_proxy = user_data;
  GSList *orderable_stores = NULL;
  guint i = 0;

  for (; i < model_props_variants->len; ++i)
    {
      GVariant *model_props = g_ptr_array_index (model_props_variants, i);
      const gchar *first_date = lookup_string_in_dict_variant (model_props, "first_date");
      const gchar *thumbnail_uri = lookup_string_in_dict_variant (model_props, "thumbnail_uri");
      const gchar *title = lookup_string_in_dict_variant (model_props, "title");
      const gchar *ekn_id = lookup_string_in_dict_variant (model_props, "ekn_id");
      const gchar *author = lookup_string_in_dict_variant (model_props, "author");
      g_autoptr(GInputStream) thumbnail_stream =
        find_thumbnail_stream_in_shards (shards_strv, thumbnail_uri);
      GDBusProxy *dbus_proxy = eos_discovery_feed_knowledge_app_proxy_get_dbus_proxy (ka_proxy);

      EosDiscoveryFeedKnowledgeAppArtworkCardStore *store =
        eos_discovery_feed_knowledge_app_artwork_card_store_new (title,
                                                                 ekn_id,
                                                                 author,
                                                                 first_date != NULL ? first_date : "",
                                                                 thumbnail_stream,
                                                                 eos_discovery_feed_knowledge_app_proxy_get_desktop_id (ka_proxy),
                                                                 g_dbus_proxy_get_name (dbus_proxy),
                                                                 eos_discovery_feed_knowledge_app_proxy_get_knowledge_search_object_path (ka_proxy),
                                                                 eos_discovery_feed_knowledge_app_proxy_get_knowledge_app_id (ka_proxy),
                                                                 EOS_DISCOVERY_FEED_CARD_LAYOUT_DIRECTION_IMAGE_FIRST,
                                                                 EOS_DISCOVERY_FEED_THUMBNAIL_SIZE_ARTWORK);
      orderable_stores = g_slist_prepend (orderable_stores,
                                          eos_discovery_feed_orderable_model_new (EOS_DISCOVERY_FEED_BASE_CARD_STORE (store),
                                                                                  EOS_DISCOVERY_FEED_CARD_STORE_TYPE_ARTWORK_CARD,
                                                                                  eos_discovery_feed_knowledge_app_proxy_get_desktop_id (ka_proxy)));
    }

    return g_steal_pointer (&orderable_stores);
}

static gpointer
append_discovery_feed_artwork_from_proxy (EosDiscoveryFeedKnowledgeAppProxy  *ka_proxy,
                                          gpointer                            proxy_data,
                                          GCancellable                       *cancellable,
                                          GError                            **error)
{
  GDBusProxy *dbus_proxy = eos_discovery_feed_knowledge_app_proxy_get_dbus_proxy (ka_proxy);
  const gchar *desktop_id = eos_discovery_feed_knowledge_app_proxy_get_desktop_id (ka_proxy);

  return call_dbus_proxy_and_construct_from_models_and_shards (dbus_proxy,
                                                               "ArtworkCardDescriptions",
                                                               desktop_id,
                                                               artwork_cards_from_shards_and_items,
                                                               ka_proxy,
                                                               cancellable,
                                                               error);
}

typedef gpointer (*AppendStoresFromProxyFunc) (EosDiscoveryFeedKnowledgeAppProxy  *ka_proxy,
                                               gpointer                            proxy_data,
                                               GCancellable                       *cancellable,
                                               GError                            **error);

typedef struct _AppendStoresTaskData
{
  EosDiscoveryFeedKnowledgeAppProxy *ka_proxy;
  AppendStoresFromProxyFunc          proxy_func;
  GDestroyNotify                     proxy_return_destroy;
  gpointer                           proxy_data;
} AppendStoresTaskData;

static AppendStoresTaskData *
append_stores_task_data_new (EosDiscoveryFeedKnowledgeAppProxy *ka_proxy,
                             AppendStoresFromProxyFunc          proxy_func,
                             GDestroyNotify                     proxy_return_destroy,
                             gpointer                           proxy_data)
{
  AppendStoresTaskData *data = g_new0 (AppendStoresTaskData, 1);

  data->ka_proxy = g_object_ref (ka_proxy);
  data->proxy_func = proxy_func;
  data->proxy_return_destroy = proxy_return_destroy;
  data->proxy_data = proxy_data;

  return data;
}

static void
append_stores_task_data_free (AppendStoresTaskData *data)
{
  g_clear_object (&data->ka_proxy);

  g_free (data);
}

G_DEFINE_AUTOPTR_CLEANUP_FUNC (AppendStoresTaskData,
                               append_stores_task_data_free)

static void
append_stores_task_from_proxy_thread (GTask        *task,
                                      gpointer      source,
                                      gpointer      task_data,
                                      GCancellable *cancellable)
{
  AppendStoresTaskData *data = task_data;
  g_autoptr(GError) local_error = NULL;

  gpointer results = data->proxy_func (data->ka_proxy,
                                       data->proxy_data,
                                       cancellable,
                                       &local_error);

  if (results == NULL)
    {
      g_task_return_error (task, g_steal_pointer (&local_error));
      return;
    }

  g_task_return_pointer (task, g_steal_pointer (&results), data->proxy_return_destroy);
}

static void
append_stores_task_from_proxy (EosDiscoveryFeedKnowledgeAppProxy *ka_proxy,
                               AppendStoresFromProxyFunc          proxy_func,
                               GDestroyNotify                     proxy_return_destroy,
                               gpointer                           proxy_func_data,
                               GCancellable                      *cancellable,
                               GAsyncReadyCallback                callback,
                               gpointer                           user_data)
{
  g_autoptr(GTask) task = g_task_new (NULL, cancellable, callback, user_data);
  g_autoptr(AppendStoresTaskData) data = append_stores_task_data_new (ka_proxy,
                                                                      proxy_func,
                                                                      proxy_return_destroy,
                                                                      proxy_func_data);

  g_task_set_return_on_cancel (task, TRUE);
  g_task_set_task_data (task,
                        g_steal_pointer (&data),
                        (GDestroyNotify) append_stores_task_data_free);
  g_task_run_in_thread (task, append_stores_task_from_proxy_thread);
}

static void
object_slist_free (GSList *slist)
{
  g_slist_free_full (slist, g_object_unref);
}

static void
marshal_word_quote_into_store (GObject      *source,
                               GAsyncResult *result,
                               gpointer      user_data)
{
  g_autoptr(GTask) task = user_data;
  g_autoptr(GError) local_error = NULL;
  g_autoptr(GPtrArray) word_quote_results = g_task_propagate_pointer (G_TASK (result),
                                                                      &local_error);
  GSList *word_quote_card_results = NULL;
  EosDiscoveryFeedWordCardStore *word_store = NULL;
  EosDiscoveryFeedQuoteCardStore *quote_store = NULL;
  EosDiscoveryFeedWordQuoteCardStore *store = NULL;

  if (word_quote_results == NULL)
    {
      g_task_return_error (task, g_steal_pointer (&local_error));
      return;
    }

  /* Unpack the word/quote results and concatenate the pointer arrays */
  if (word_quote_results->len != 2)
    {
      g_task_return_new_error (task,
                               G_IO_ERROR,
                               G_IO_ERROR_FAILED,
                               "Expected exactly two results for word/quote query.");
      return;
    }

  word_store = g_task_propagate_pointer (G_TASK (g_ptr_array_index (word_quote_results, 0)),
                                         &local_error);

  if (word_store == NULL)
    {
      g_task_return_error (task, g_steal_pointer (&local_error));
      return;
    }

  quote_store = g_task_propagate_pointer (G_TASK (g_ptr_array_index (word_quote_results, 1)),
                                          &local_error);

  if (quote_store == NULL)
    {
      g_task_return_error (task, g_steal_pointer (&local_error));
      return;
    }

  store = eos_discovery_feed_word_quote_card_store_new (word_store, quote_store);

  /* Return a list with one element for consistency with everything else,
   * so that we can flat-map everything together in the end */
  word_quote_card_results = g_slist_prepend (word_quote_card_results,
                                             eos_discovery_feed_orderable_model_new (EOS_DISCOVERY_FEED_BASE_CARD_STORE (store),
                                                                                     EOS_DISCOVERY_FEED_CARD_STORE_TYPE_WORD_QUOTE_CARD,
                                                                                     "word-quote"));

  g_task_return_pointer (task,
                         g_steal_pointer (&word_quote_card_results),
                         (GDestroyNotify) object_slist_free);
}

static GObject *
word_card_from_item (GVariant *model_props,
                     gpointer  user_data)
{
  const gchar *word = lookup_string_in_dict_variant (model_props, "word");
  const gchar *part_of_speech = lookup_string_in_dict_variant (model_props, "part_of_speech");
  const gchar *definition = lookup_string_in_dict_variant (model_props, "definition");

  return G_OBJECT (eos_discovery_feed_word_card_store_new (word,
                                                           part_of_speech,
                                                           definition));
}

static gpointer
append_discovery_feed_word_from_proxy (EosDiscoveryFeedKnowledgeAppProxy  *ka_proxy,
                                       gpointer                            proxy_data,
                                       GCancellable                       *cancellable,
                                       GError                            **error)
{
  GDBusProxy *dbus_proxy = eos_discovery_feed_knowledge_app_proxy_get_dbus_proxy (ka_proxy);
  const gchar *desktop_id = eos_discovery_feed_knowledge_app_proxy_get_desktop_id (ka_proxy);

  return call_dbus_proxy_and_construct_from_model (dbus_proxy,
                                                   "GetWordOfTheDay",
                                                   desktop_id,
                                                   word_card_from_item,
                                                   NULL,
                                                   cancellable,
                                                   error);
}

static GObject *
quote_card_from_item (GVariant *model_props,
                      gpointer  user_data)
{
  const gchar *title = lookup_string_in_dict_variant (model_props, "title");
  const gchar *author = lookup_string_in_dict_variant (model_props, "author");

  return G_OBJECT (eos_discovery_feed_quote_card_store_new (title, author));
}

static gpointer
append_discovery_feed_quote_from_proxy (EosDiscoveryFeedKnowledgeAppProxy  *ka_proxy,
                                        gpointer                            proxy_data,
                                        GCancellable                       *cancellable,
                                        GError                            **error)
{
  GDBusProxy *dbus_proxy = eos_discovery_feed_knowledge_app_proxy_get_dbus_proxy (ka_proxy);
  const gchar *desktop_id = eos_discovery_feed_knowledge_app_proxy_get_desktop_id (ka_proxy);

  return call_dbus_proxy_and_construct_from_model (dbus_proxy,
                                                   "GetQuoteOfTheDay",
                                                   desktop_id,
                                                   quote_card_from_item,
                                                   NULL,
                                                   cancellable,
                                                   error);
}

static void
append_discovery_feed_word_quote_from_proxies (EosDiscoveryFeedKnowledgeAppProxy *word_ka_proxy,
                                               EosDiscoveryFeedKnowledgeAppProxy *quote_ka_proxy,
                                               GCancellable                      *cancellable,
                                               GAsyncReadyCallback                callback,
                                               gpointer                           user_data)
{
  g_autoptr(GTask) task = g_task_new (NULL, cancellable, callback, user_data);
  AllTasksResultsClosure *all_tasks_closure = all_tasks_results_closure_new (g_object_unref,
                                                                             marshal_word_quote_into_store,
                                                                             g_steal_pointer (&task));

  /* Ignoring the return values here, recall that the task's lifecycle owns
   * the task */
  append_stores_task_from_proxy (word_ka_proxy,
                                 append_discovery_feed_word_from_proxy,
                                 g_object_unref,
                                 NULL,
                                 cancellable,
                                 individual_task_result_completed,
                                 individual_task_result_closure_new (all_tasks_closure));

  append_stores_task_from_proxy (quote_ka_proxy,
                                 append_discovery_feed_quote_from_proxy,
                                 g_object_unref,
                                 NULL,
                                 cancellable,
                                 individual_task_result_completed,
                                 individual_task_result_closure_new (all_tasks_closure));
}

static void
unordered_card_arrays_from_queries (GPtrArray           *ka_proxies,
                                    GCancellable        *cancellable,
                                    GAsyncReadyCallback  callback,
                                    gpointer             user_data)
{
  AllTasksResultsClosure *all_tasks_closure = all_tasks_results_closure_new (g_object_unref,
                                                                             callback,
                                                                             user_data);
  guint i = 0;
  g_autoptr(GPtrArray) word_proxies = g_ptr_array_new ();
  g_autoptr(GPtrArray) quote_proxies = g_ptr_array_new ();

  for (i = 0; i < ka_proxies->len; ++i)
    {
      EosDiscoveryFeedKnowledgeAppProxy *ka_proxy = g_ptr_array_index (ka_proxies, i);
      GDBusProxy *dbus_proxy = eos_discovery_feed_knowledge_app_proxy_get_dbus_proxy (ka_proxy);
      const gchar *interface_name = g_dbus_proxy_get_interface_name (dbus_proxy);

      if (g_strcmp0 (interface_name, "com.endlessm.DiscoveryFeedContent") == 0)
        append_stores_task_from_proxy (ka_proxy,
                                       append_discovery_feed_content_from_proxy,
                                       (GDestroyNotify) object_slist_free,
                                       append_discovery_feed_content_from_proxy_data_new ("ArticleCardDescriptions",
                                                                                          EOS_DISCOVERY_FEED_CARD_STORE_TYPE_ARTICLE_CARD,
                                                                                          EOS_DISCOVERY_FEED_CARD_LAYOUT_DIRECTION_IMAGE_FIRST,
                                                                                          eos_discovery_feed_knowledge_app_card_store_new,
                                                                                          EOS_DISCOVERY_FEED_THUMBNAIL_SIZE_ARTICLE),
                                       cancellable,
                                       individual_task_result_completed,
                                       individual_task_result_closure_new (all_tasks_closure));
      else if (g_strcmp0 (interface_name, "com.endlessm.DiscoveryFeedNews") == 0)
        append_stores_task_from_proxy (ka_proxy,
                                       append_discovery_feed_content_from_proxy,
                                       (GDestroyNotify) object_slist_free,
                                       append_discovery_feed_content_from_proxy_data_new ("GetRecentNews",
                                                                                          EOS_DISCOVERY_FEED_CARD_STORE_TYPE_ARTICLE_CARD,
                                                                                          EOS_DISCOVERY_FEED_CARD_LAYOUT_DIRECTION_IMAGE_LAST,
                                                                                          (EosDiscoveryFeedKnowledgeAppCardStoreFactoryFunc) eos_discovery_feed_knowledge_app_news_card_store_new,
                                                                                          EOS_DISCOVERY_FEED_THUMBNAIL_SIZE_NEWS),
                                       cancellable,
                                       individual_task_result_completed,
                                       individual_task_result_closure_new (all_tasks_closure));
      else if (g_strcmp0 (interface_name, "com.endlessm.DiscoveryFeedVideo") == 0)
        append_stores_task_from_proxy (ka_proxy,
                                       append_discovery_feed_video_from_proxy,
                                       (GDestroyNotify) object_slist_free,
                                       NULL,
                                       cancellable,
                                       individual_task_result_completed,
                                       individual_task_result_closure_new (all_tasks_closure));
      else if (g_strcmp0 (interface_name, "com.endlessm.DiscoveryFeedArtwork") == 0)
        append_stores_task_from_proxy (ka_proxy,
                                       append_discovery_feed_artwork_from_proxy,
                                       (GDestroyNotify) object_slist_free,
                                       NULL,
                                       cancellable,
                                       individual_task_result_completed,
                                       individual_task_result_closure_new (all_tasks_closure));
      else if (g_strcmp0 (interface_name, "com.endlessm.DiscoveryFeedWord") == 0)
        g_ptr_array_add (word_proxies, ka_proxy);
      else if (g_strcmp0 (interface_name, "com.endlessm.DiscoveryFeedQuote") == 0)
        g_ptr_array_add (quote_proxies, ka_proxy);
    }

  for (i = 0; i < MIN (word_proxies->len, quote_proxies->len); ++i)
    {
      append_discovery_feed_word_quote_from_proxies (g_ptr_array_index (word_proxies, i),
                                                     g_ptr_array_index (quote_proxies, i),
                                                     cancellable,
                                                     individual_task_result_completed,
                                                     individual_task_result_closure_new (all_tasks_closure));
    }
}

static void
received_all_unordered_card_array_results_from_queries (GObject      *source,
                                                        GAsyncResult *result,
                                                        gpointer      user_data)
{
  g_autoptr(GError) local_error = NULL;
  g_autoptr(GPtrArray) results = g_task_propagate_pointer (G_TASK (result),
                                                           &local_error);
  GSList *all_unordered_elements = NULL;
  g_autoptr(GTask) task = user_data;
  guint i = 0;

  /* This basically shouldn't happen, but handle it anyway */
  if (results == NULL)
    {
      g_message ("Error getting all unordered card results: %s", local_error->message);
      g_task_return_error (task, g_steal_pointer (&local_error));
      return;
    }

  /* Go through each of the results, complain about the ones that failed
   * but keep the ones that yielded some models. We'll flat-map them all
   * together later */
  for (i = 0; i < results->len; ++i)
    {
      GSList *result_list = g_task_propagate_pointer (g_ptr_array_index (results, i),
                                                      &local_error);

      if (result_list == NULL)
        {
          g_message ("Query failed: %s", local_error->message);
          g_clear_error (&local_error);
          continue;
        }

      all_unordered_elements = g_slist_concat (all_unordered_elements, result_list);
    }

  g_task_return_pointer (task,
                         all_unordered_elements,
                         (GDestroyNotify) object_slist_free);
}

/**
 * eos_discovery_feed_unordered_results_from_queries_finish:
 * @result: A #GAsyncResult
 * @error: A #GError
 *
 * Complete the call to eos_discovery_feed_unordered_results_from_queries.
 *
 * Returns: (transfer container) (element-type EosDiscoveryFeedBaseCardStore):
 *          A #GSList of #EosDiscoveryFeedBaseCardStore. Note that the list will
 *          be in reversed order internally for efficiency but in any event
 *          are not guaranteed to be in a user-friendly order. You should
 *          use eos_discovery_feed_arrange_orderable_models to ensure that the
 *          models are in the correct order for presentation to the user.
 */
GSList *
eos_discovery_feed_unordered_results_from_queries_finish (GAsyncResult  *result,
                                                          GError       **error)
{
  return g_task_propagate_pointer (G_TASK (result), error);
}

/**
 * eos_discovery_feed_unordered_results_from_queries:
 * @ka_proxies: (element-type EosDiscoveryFeedKnowledgeAppProxy): An array of #EosDiscoveryFeedKnowledgeAppProxy
 * @cancellable: A #GCancellable
 * @callback: Callback function
 * @user_data: Closure for @callback
 *
 * Query all proxies in @ka_proxies and pass a #GPtrArray of non-ordered
 * model results to @callback.
 */
void
eos_discovery_feed_unordered_results_from_queries (GPtrArray           *ka_proxies,
                                                   GCancellable        *cancellable,
                                                   GAsyncReadyCallback  callback,
                                                   gpointer             user_data)
{
  GTask *task = g_task_new (NULL, cancellable, callback, user_data);

  g_task_set_return_on_cancel (task, TRUE);
  unordered_card_arrays_from_queries (ka_proxies,
                                      cancellable,
                                      received_all_unordered_card_array_results_from_queries,
                                      task);
}

