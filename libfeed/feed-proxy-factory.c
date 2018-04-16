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

#include <gio/gdesktopappinfo.h>
#include <gio/gio.h>

#include "feed-all-async-tasks-private.h"
#include "feed-knowledge-app-proxy.h"
#include "feed-provider-info.h"
#include "feed-proxy-factory.h"

#define DISCOVERY_FEED_CONTENT_IFACE \
  "<node>" \
  "  <interface name=\"com.endlessm.DiscoveryFeedContent\">" \
  "    <method name=\"ArticleCardDescriptions\">" \
  "      <arg type=\"as\" name=\"Shards\" direction=\"out\" />" \
  "      <arg type=\"aa{ss}\" name=\"Result\" direction=\"out\" />" \
  "    </method>" \
  "  </interface>" \
  "</node>"

#define DISCOVERY_FEED_NEWS_IFACE \
  "<node>" \
  "  <interface name=\"com.endlessm.DiscoveryFeedNews\">" \
  "    <method name=\"GetRecentNews\">" \
  "      <arg type=\"as\" name=\"Shards\" direction=\"out\" />" \
  "      <arg type=\"aa{ss}\" name=\"Result\" direction=\"out\" />" \
  "    </method>" \
  "  </interface>" \
  "</node>"

#define DISCOVERY_FEED_INSTALLABLE_APPS_IFACE \
  "<node>" \
  "  <interface name=\"com.endlessm.DiscoveryFeedInstallableApps\">" \
  "    <method name=\"GetInstallableApps\">" \
  "      <arg type=\"aa{sv}\" name=\"Results\" direction=\"out\" />" \
  "    </method>" \
  "  </interface>" \
  "</node>"

#define DISCOVERY_FEED_VIDEO_IFACE \
  "<node>" \
  "  <interface name=\"com.endlessm.DiscoveryFeedVideo\">" \
  "    <method name=\"GetVideos\">" \
  "      <arg type=\"as\" name=\"Shards\" direction=\"out\" />" \
  "      <arg type=\"aa{ss}\" name=\"Result\" direction=\"out\" />" \
  "    </method>" \
  "  </interface>" \
  "</node>"

#define DISCOVERY_FEED_WORD_IFACE \
  "<node>" \
  "  <interface name=\"com.endlessm.DiscoveryFeedWord\">" \
  "    <method name=\"GetWordOfTheDay\">" \
  "      <arg type=\"a{ss}\" name=\"Results\" direction=\"out\" />" \
  "    </method>" \
  "  </interface>" \
  "</node>"

#define DISCOVERY_FEED_QUOTE_IFACE \
  "<node>" \
  "  <interface name=\"com.endlessm.DiscoveryFeedQuote\">" \
  "    <method name=\"GetQuoteOfTheDay\">" \
  "      <arg type=\"a{ss}\" name=\"Results\" direction=\"out\" />" \
  "    </method>" \
  "  </interface>" \
  "</node>"

#define DISCOVERY_FEED_ARTWORK_IFACE \
  "<node>" \
  "  <interface name=\"com.endlessm.DiscoveryFeedArtwork\">" \
  "    <method name=\"ArtworkCardDescriptions\">" \
  "      <arg type=\"as\" name=\"Shards\" direction=\"out\" />" \
  "      <arg type=\"aa{ss}\" name=\"Result\" direction=\"out\" />" \
  "    </method>" \
  "  </interface>" \
  "</node>"

typedef struct _DiscoveryFeedInterfaceNameToInterfaceMetadata {
  const gchar *interface_name;
  const gchar *interface_metadata;
} DiscoveryFeedInterfaceNameToInterfaceMetadata;

static const DiscoveryFeedInterfaceNameToInterfaceMetadata metadata_table[] = {
  { "com.endlessm.DiscoveryFeedContent", DISCOVERY_FEED_CONTENT_IFACE },
  { "com.endlessm.DiscoveryFeedNews", DISCOVERY_FEED_NEWS_IFACE },
  { "com.endlessm.DiscoveryFeedInstallableApps", DISCOVERY_FEED_INSTALLABLE_APPS_IFACE },
  { "com.endlessm.DiscoveryFeedVideo", DISCOVERY_FEED_VIDEO_IFACE },
  { "com.endlessm.DiscoveryFeedQuote", DISCOVERY_FEED_QUOTE_IFACE },
  { "com.endlessm.DiscoveryFeedWord", DISCOVERY_FEED_WORD_IFACE },
  { "com.endlessm.DiscoveryFeedArtwork", DISCOVERY_FEED_ARTWORK_IFACE }
};
static const gsize metadata_table_len = G_N_ELEMENTS (metadata_table);

static const gchar *
lookup_metadata_for_interface_name (const gchar *interface_name)
{
  gsize i = 0;

  for (; i < metadata_table_len; ++i)
    if (g_strcmp0 (metadata_table[i].interface_name, interface_name) == 0)
      return metadata_table[i].interface_metadata;

  return NULL;
}

typedef struct _InstantiateProxyForInterfaceData
{
  GDBusConnection              *connection;
  EosDiscoveryFeedProviderInfo *provider_info;
  gchar                        *interface_name;
  const gchar                  *interface_metadata;
} InstantiateProxyForInterfaceData;

static InstantiateProxyForInterfaceData *
instantiate_proxy_for_interface_data_new (GDBusConnection              *connection,
                                          EosDiscoveryFeedProviderInfo *provider_info,
                                          const gchar                  *interface_name,
                                          const gchar                  *interface_metadata)
{
  InstantiateProxyForInterfaceData *data = g_new0 (InstantiateProxyForInterfaceData, 1);

  data->connection = g_object_ref (connection);
  data->provider_info = g_object_ref (provider_info);
  data->interface_name = g_strdup (interface_name);

  /* Assumed to be a static string */
  data->interface_metadata = interface_metadata;

  return data;
}

static void
instantiate_proxy_for_interface_data_free (InstantiateProxyForInterfaceData *data)
{
  g_clear_object (&data->connection);
  g_clear_object (&data->provider_info);
  g_clear_pointer (&data->interface_name, g_free);

  g_free (data);
}

static EosDiscoveryFeedKnowledgeAppProxy *
instantiate_proxy_for_interface_sync (GDBusConnection               *connection,
                                      EosDiscoveryFeedProviderInfo  *provider_info,
                                      const gchar                   *interface_name,
                                      const gchar                   *interface_metadata,
                                      GCancellable                  *cancellable,
                                      GError                       **error)
{
  g_autoptr(GDBusNodeInfo) node_info = g_dbus_node_info_new_for_xml (interface_metadata,
                                                                     error);
  GDBusInterfaceInfo *interface_info = NULL;
  g_autoptr(GDBusProxy) proxy = NULL;

  const gchar *bus_name = NULL;
  const gchar *object_path = NULL; 
  const gchar *desktop_id = NULL;
  const gchar *knowledge_search_object_path = NULL;
  const gchar *knowledge_app_id = NULL;

  if (node_info == NULL)
    return NULL;

  /* This will be NULL in the event that interface_name could
   * not be found in node_info. The worst that will happen in that
   * case is that we do not get any validation that the proxy supports
   * the methods that we would like it to support. */
  interface_info = g_dbus_node_info_lookup_interface (node_info, interface_name);

  bus_name = eos_discovery_feed_provider_info_get_bus_name (provider_info);
  object_path = eos_discovery_feed_provider_info_get_object_path (provider_info);
  desktop_id = eos_discovery_feed_provider_info_get_desktop_file_id (provider_info);
  knowledge_search_object_path = eos_discovery_feed_provider_info_get_knowledge_search_object_path (provider_info);
  knowledge_app_id = eos_discovery_feed_provider_info_get_knowledge_app_id (provider_info);

  /* Make sure that the object path is valid. If it is not, return an error. This
   * will cause the current feed provider to not load with a warning but it is
   * better than hitting an assertion in g_dbus_proxy_new_sync */
  if (!g_variant_is_object_path (object_path))
    {
      g_set_error (error,
                   G_IO_ERROR,
                   G_IO_ERROR_FAILED,
                   "Object path %s is not valid",
                   object_path);
      return NULL;
    }

  proxy = g_dbus_proxy_new_sync (connection,
                                 G_DBUS_PROXY_FLAGS_NONE,
                                 interface_info,
                                 bus_name,
                                 object_path,
                                 interface_name,
                                 cancellable,
                                 error);

  if (proxy == NULL)
    return NULL;

  return eos_discovery_feed_knowledge_app_proxy_new (proxy,
                                                     desktop_id,
                                                     knowledge_search_object_path,
                                                     knowledge_app_id);
}

static void
instantiate_proxy_for_interface_thread (GTask        *task,
                                        gpointer      source,
                                        gpointer      task_data,
                                        GCancellable *cancellable)
{
  InstantiateProxyForInterfaceData *data = task_data;
  g_autoptr(GError) local_error = NULL;
  g_autoptr(EosDiscoveryFeedKnowledgeAppProxy) ka_proxy =
    instantiate_proxy_for_interface_sync (data->connection,
                                          data->provider_info,
                                          data->interface_name,
                                          data->interface_metadata,
                                          cancellable,
                                          &local_error);

  if (ka_proxy == NULL)
    {
      g_task_return_error (task, g_steal_pointer (&local_error));
      return;
    }

  g_task_return_pointer (task, g_steal_pointer (&ka_proxy), g_object_unref);
}

static void
instantiate_proxy_for_interface (GDBusConnection              *connection,
                                 EosDiscoveryFeedProviderInfo *provider_info,
                                 const gchar                  *interface_name,
                                 const gchar                  *interface_metadata,
                                 GCancellable                 *cancellable,
                                 GAsyncReadyCallback           callback,
                                 gpointer                      user_data)
{
  g_autoptr(GTask) task = g_task_new (NULL, cancellable, callback, user_data);

  g_task_set_return_on_cancel (task, TRUE);
  g_task_set_task_data (task,
                        instantiate_proxy_for_interface_data_new (connection,
                                                                  provider_info,
                                                                  interface_name,
                                                                  interface_metadata),
                        (GDestroyNotify) instantiate_proxy_for_interface_data_free);
  g_task_run_in_thread (task, instantiate_proxy_for_interface_thread);
}

static void
on_received_all_instantiation_results (GObject      *source,
                                       GAsyncResult *result,
                                       gpointer      user_data)
{
  g_autoptr(GError) local_error = NULL;
  g_autoptr(GTask) task = G_TASK (user_data);
  g_autoptr(GPtrArray) instantiation_results = g_task_propagate_pointer (G_TASK (result),
                                                                         &local_error);
  g_autoptr(GPtrArray) proxies = NULL;
  guint i = 0;

  if (instantiation_results == NULL)
    {
      g_task_return_error (task, g_steal_pointer (&local_error));
      return;
    }

  proxies = g_ptr_array_new_full (instantiation_results->len, g_object_unref);

  /* Go through each of the results, complain about the ones that failed
   * but keep the ones that sucessfuly returned a proxy. */
  for (i = 0; i < instantiation_results->len; ++i)
    {
      g_autoptr(GError) instantiation_error = NULL;
      g_autoptr(EosDiscoveryFeedKnowledgeAppProxy) ka_proxy =
        g_task_propagate_pointer (G_TASK (g_ptr_array_index (instantiation_results, i)),
                                  &instantiation_error);

      if (ka_proxy == NULL)
        {
          /* XXX: This error message is a little useless, maybe we need to
           *      pass through information on the interface as opposed to
           *      just returning NULL on error. */
          g_message ("Unable to instantiate DBus proxy: %s", instantiation_error->message);
          continue;
        }

      g_ptr_array_add (proxies, g_steal_pointer (&ka_proxy));
    }

  g_task_return_pointer (task,
                         g_steal_pointer (&proxies),
                         (GDestroyNotify) g_ptr_array_unref);
}

/**
 * eos_discovery_feed_instantiate_proxies_from_discovery_feed_providers_finish:
 * @result: A #GAsyncResult
 * @error: A #GError
 *
 * Complete a call to eos_discovery_feed_instantiate_proxies_from_discovery_feed_providers
 * and get a #GPtrArray of #EosDiscoveryFeedKnowledgeAppProxy that were
 * successfully created as a result of this call. Failures are logged
 * to the standard error.
 *
 * Returns: (transfer container) (element-type EosDiscoveryFeedKnowledgeAppProxy): A
 *          #GPtrArray of #EosDiscoveryFeedKnowledgeAppProxy or %NULL on
 *          failure with @error set.
 */
GPtrArray *
eos_discovery_feed_instantiate_proxies_from_discovery_feed_providers_finish (GAsyncResult  *result,
                                                                             GError       **error)
{
  return g_task_propagate_pointer (G_TASK (result), error);
}

/**
 * eos_discovery_feed_instantiate_proxies_from_discovery_feed_providers:
 * @connection: A #GDBusConnection
 * @providers: (element-type EosDiscoveryFeedProviderInfo): A #GPtrArray of
 *             #EosDiscoveryFeedProviderInfo objects, used to construct all the
 *             relevant proxies
 * @cancellable: A #GCancellable
 * @callback: A #GAsyncReadyCallback which will be invoked with a #GPtrArray
 *            of #GAsyncResult, indicating the result of construction each
 *            proxy.
 * @user_data: Closure for @callback
 *
 * Concurrently construct each a #EosDiscoveryFeedKnowledgeAppProxy from each
 * interface specified in the array of #EosDiscoveryFeedProviderInfo objects
 * passed in @providers. The caller will need to check the result of construction
 * for each #GAsyncResult in the #GPtrArray passed to the callback.
 */
void
eos_discovery_feed_instantiate_proxies_from_discovery_feed_providers (GDBusConnection     *connection,
                                                                      GPtrArray           *providers,
                                                                      GCancellable        *cancellable,
                                                                      GAsyncReadyCallback  callback,
                                                                      gpointer             user_data)
{
  g_autoptr(GTask) task = g_task_new (NULL, cancellable, callback, user_data);
  AllTasksResultsClosure *all_tasks_closure = all_tasks_results_closure_new (g_object_unref,
                                                                             on_received_all_instantiation_results,
                                                                             g_steal_pointer (&task));
  guint i = 0;

  for (; i < providers->len; ++i)
    {
      EosDiscoveryFeedProviderInfo *provider_info = g_ptr_array_index (providers, i);
      const gchar * const *iter = eos_discovery_feed_provider_info_get_interfaces (provider_info);

      for (; *iter != NULL; ++iter)
        {
          const gchar *interface_metadata = lookup_metadata_for_interface_name (*iter);

          if (interface_metadata == NULL)
            {
              g_message ("Unable to find interface metadata for %s", *iter);
              continue;
            }

          instantiate_proxy_for_interface (connection,
                                           provider_info,
                                           *iter,
                                           interface_metadata,
                                           cancellable,
                                           individual_task_result_completed,
                                           individual_task_result_closure_new (all_tasks_closure));
        }
    }
}

