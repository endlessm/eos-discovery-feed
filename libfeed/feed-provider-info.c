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

#include "feed-enums.h"
#include "feed-provider-info.h"

typedef struct _EosDiscoveryFeedProviderInfo {
  GObject object;
} EosDiscoeryFeedProviderInfo;

typedef struct _EosDiscoveryFeedProviderInfoPrivate
{
  gchar *object_path;
  gchar *bus_name;
  GStrv  interfaces;
  gchar *knowledge_app_id;
  gchar *desktop_file_id;
  gchar *knowledge_search_object_path;
} EosDiscoveryFeedProviderInfoPrivate;

G_DEFINE_TYPE_WITH_PRIVATE (EosDiscoveryFeedProviderInfo,
                            eos_discovery_feed_provider_info,
                            G_TYPE_OBJECT)

enum {
  PROP_0,
  PROP_OBJECT_PATH,
  PROP_BUS_NAME,
  PROP_INTERFACES,
  PROP_KNOWLEDGE_APP_ID,
  PROP_DESKTOP_FILE_ID,
  PROP_KNOWLEDGE_SEARCH_OBJECT_PATH,
  NPROPS
};

static GParamSpec *eos_discovery_feed_provider_info_props [NPROPS] = { NULL, };

static void
eos_discovery_feed_provider_info_init (EosDiscoveryFeedProviderInfo *provider_info)
{
}

/**
 * eos_discovery_feed_provider_info_get_object_path:
 * @provider_info: A #EosDiscoveryFeedProviderInfo
 *
 * Returns: The DBus object path for this provider.
 */
const gchar *
eos_discovery_feed_provider_info_get_object_path (EosDiscoveryFeedProviderInfo *provider_info)
{
  EosDiscoveryFeedProviderInfoPrivate *priv = eos_discovery_feed_provider_info_get_instance_private (provider_info);

  return priv->object_path;
}

/**
 * eos_discovery_feed_provider_info_get_bus_name:
 * @provider_info: A #EosDiscoveryFeedProviderInfo
 *
 * Returns: The DBus name for this provider.
 */
const gchar *
eos_discovery_feed_provider_info_get_bus_name (EosDiscoveryFeedProviderInfo *provider_info)
{
  EosDiscoveryFeedProviderInfoPrivate *priv = eos_discovery_feed_provider_info_get_instance_private (provider_info);

  return priv->bus_name;
}

/**
 * eos_discovery_feed_provider_info_get_interfaces:
 * @provider_info: A #EosDiscoveryFeedProviderInfo
 *
 * Returns: (transfer none): The supported DBus interface names for this provider.
 */
const gchar * const *
eos_discovery_feed_provider_info_get_interfaces (EosDiscoveryFeedProviderInfo *provider_info)
{
  EosDiscoveryFeedProviderInfoPrivate *priv = eos_discovery_feed_provider_info_get_instance_private (provider_info);

  return (const gchar * const *) priv->interfaces;
}

/**
 * eos_discovery_feed_provider_info_get_knowledge_app_id:
 * @provider_info: A #EosDiscoveryFeedProviderInfo
 *
 * Returns: (nullable): The corresponding Knowledge App ID for this provider or
 *                      %NULL if there is no corresponding Knowledge App.
 */
const gchar *
eos_discovery_feed_provider_info_get_knowledge_app_id (EosDiscoveryFeedProviderInfo *provider_info)
{
  EosDiscoveryFeedProviderInfoPrivate *priv = eos_discovery_feed_provider_info_get_instance_private (provider_info);

  return priv->knowledge_app_id;
}

/**
 * eos_discovery_feed_provider_info_get_desktop_file_id:
 * @provider_info: A #EosDiscoveryFeedProviderInfo
 *
 * Returns: (nullable): The corresponding Desktop ID for this provider or
 *                      %NULL if there is no corresponding Desktop File.
 */
const gchar *
eos_discovery_feed_provider_info_get_desktop_file_id (EosDiscoveryFeedProviderInfo *provider_info)
{
  EosDiscoveryFeedProviderInfoPrivate *priv = eos_discovery_feed_provider_info_get_instance_private (provider_info);

  return priv->desktop_file_id;
}

/**
 * eos_discovery_feed_provider_info_get_knowledge_search_object_path:
 * @provider_info: A #EosDiscoveryFeedProviderInfo
 *
 * Returns: (nullable): The corresponding Knowledge Search Object Path for
 *                      this provider or %NULL if there is no corresponding
 *                      Knowledge App.
 */
const gchar *
eos_discovery_feed_provider_info_get_knowledge_search_object_path (EosDiscoveryFeedProviderInfo *provider_info)
{
  EosDiscoveryFeedProviderInfoPrivate *priv = eos_discovery_feed_provider_info_get_instance_private (provider_info);

  return priv->knowledge_search_object_path;
}

static void
eos_discovery_feed_provider_info_set_property (GObject      *object,
                                               guint         prop_id,
                                               const GValue *value,
                                               GParamSpec   *pspec)
{
  EosDiscoveryFeedProviderInfo *store = EOS_DISCOVERY_FEED_PROVIDER_INFO (object);
  EosDiscoveryFeedProviderInfoPrivate *priv = eos_discovery_feed_provider_info_get_instance_private (store);

  switch (prop_id)
    {
    case PROP_OBJECT_PATH:
      priv->object_path = g_value_dup_string (value);
      break;
    case PROP_BUS_NAME:
      priv->bus_name = g_value_dup_string (value);
      break;
    case PROP_INTERFACES:
      priv->interfaces = g_value_dup_boxed (value);
      break;
    case PROP_KNOWLEDGE_APP_ID:
      priv->knowledge_app_id = g_value_dup_string (value);
      break;
    case PROP_DESKTOP_FILE_ID:
      priv->desktop_file_id = g_value_dup_string (value);
      break;
    case PROP_KNOWLEDGE_SEARCH_OBJECT_PATH:
      priv->knowledge_search_object_path = g_value_dup_string (value);
      break;
    default:
      G_OBJECT_WARN_INVALID_PROPERTY_ID (object, prop_id, pspec);
    }
}

static void
eos_discovery_feed_provider_info_get_property (GObject    *object,
                                               guint       prop_id,
                                               GValue     *value,
                                               GParamSpec *pspec)
{
  EosDiscoveryFeedProviderInfo *store = EOS_DISCOVERY_FEED_PROVIDER_INFO (object);
  EosDiscoveryFeedProviderInfoPrivate *priv = eos_discovery_feed_provider_info_get_instance_private (store);

  switch (prop_id)
    {
    case PROP_OBJECT_PATH:
      g_value_set_string (value, priv->object_path);
      break;
    case PROP_BUS_NAME:
      g_value_set_string (value, priv->bus_name);
      break;
    case PROP_INTERFACES:
      g_value_set_boxed (value, priv->interfaces);
      break;
    case PROP_KNOWLEDGE_APP_ID:
      g_value_set_string (value, priv->knowledge_app_id);
      break;
    case PROP_DESKTOP_FILE_ID:
      g_value_set_string (value, priv->desktop_file_id);
      break;
    case PROP_KNOWLEDGE_SEARCH_OBJECT_PATH:
      g_value_set_string (value, priv->knowledge_search_object_path);
      break;
    default:
      G_OBJECT_WARN_INVALID_PROPERTY_ID (object, prop_id, pspec);
    }
}

static void
eos_discovery_feed_provider_info_finalize (GObject *object)
{
  EosDiscoveryFeedProviderInfo *store = EOS_DISCOVERY_FEED_PROVIDER_INFO (object);
  EosDiscoveryFeedProviderInfoPrivate *priv = eos_discovery_feed_provider_info_get_instance_private (store);

  g_clear_pointer (&priv->object_path, g_free);
  g_clear_pointer (&priv->bus_name, g_free);
  g_clear_pointer (&priv->interfaces, g_strfreev);
  g_clear_pointer (&priv->knowledge_app_id, g_free);
  g_clear_pointer (&priv->desktop_file_id, g_free);
  g_clear_pointer (&priv->knowledge_search_object_path, g_free);

  G_OBJECT_CLASS (eos_discovery_feed_provider_info_parent_class)->finalize (object);
}

static void
eos_discovery_feed_provider_info_class_init (EosDiscoveryFeedProviderInfoClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);

  object_class->get_property = eos_discovery_feed_provider_info_get_property;
  object_class->set_property = eos_discovery_feed_provider_info_set_property;
  object_class->finalize = eos_discovery_feed_provider_info_finalize;

  eos_discovery_feed_provider_info_props[PROP_OBJECT_PATH] =
    g_param_spec_string ("object-path",
                         "Provider Object Path",
                         "The object path of the provider on the bus name",
                         "",
                         G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY);

  eos_discovery_feed_provider_info_props[PROP_BUS_NAME] =
    g_param_spec_string ("bus-name",
                         "Bus Name",
                         "The Bus Name the provider file is running on",
                         "",
                         G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY);

  eos_discovery_feed_provider_info_props[PROP_INTERFACES] =
    g_param_spec_boxed ("interfaces",
                        "Interfaces",
                        "Interfaces that this provider file supports",
                        G_TYPE_STRV,
                        G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY);

  eos_discovery_feed_provider_info_props[PROP_KNOWLEDGE_APP_ID] =
    g_param_spec_string ("knowledge-app-id",
                         "Knowledge App ID",
                         "The App ID for the corresponding knowledge app",
                         "",
                         G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY);

  eos_discovery_feed_provider_info_props[PROP_DESKTOP_FILE_ID] =
    g_param_spec_string ("desktop-id",
                         "Desktop ID",
                         "The Desktop ID for the corresponding app",
                         "",
                         G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY);

  eos_discovery_feed_provider_info_props[PROP_KNOWLEDGE_SEARCH_OBJECT_PATH] =
    g_param_spec_string ("knowledge-search-object-path",
                         "Knowledge Search Object Path",
                         "Object Path for the Knowledge Search Interface on this app",
                         "",
                         G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY);

  g_object_class_install_properties (object_class,
                                     NPROPS,
                                     eos_discovery_feed_provider_info_props);
}

EosDiscoveryFeedProviderInfo *
eos_discovery_feed_provider_info_new (const gchar         *object_path,
                                      const gchar         *bus_name,
                                      const gchar * const *interfaces,
                                      const gchar         *knowledge_app_id,
                                      const gchar         *desktop_file_id,
                                      const gchar         *knowledge_search_object_path)
{
  return g_object_new (EOS_DISCOVERY_FEED_TYPE_PROVIDER_INFO,
                       "object-path", object_path,
                       "bus-name", bus_name,
                       "interfaces", interfaces,
                       "knowledge-app-id", knowledge_app_id,
                       "desktop-id", desktop_file_id,
                       "knowledge-search-object-path", knowledge_search_object_path,
                       NULL);
}

