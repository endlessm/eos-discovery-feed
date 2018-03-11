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
#include "feed-knowledge-app-card-store.h"
#include "feed-sizes.h"

struct _EosDiscoveryFeedKnowledgeAppCardStore
{
  GObject parent_instance;
};

typedef struct _EosDiscoveryFeedKnowledgeAppCardStorePrivate
{
  gchar                               *title;
  gchar                               *uri;
  gchar                               *synopsis;
  gchar                               *bus_name;
  gchar                               *knowledge_search_object_path;
  gchar                               *knowledge_app_id;
  GInputStream                        *thumbnail;
  EosDiscoveryFeedCardLayoutDirection  layout_direction;
  guint                                thumbnail_size;
} EosDiscoveryFeedKnowledgeAppCardStorePrivate;

static void base_card_store_iface_init (EosDiscoveryFeedBaseCardStoreInterface *iface);

G_DEFINE_TYPE_WITH_CODE (EosDiscoveryFeedKnowledgeAppCardStore,
                         eos_discovery_feed_knowledge_app_card_store,
                         EOS_DISCOVERY_FEED_TYPE_APP_CARD_STORE,
                         G_IMPLEMENT_INTERFACE (EOS_DISCOVERY_FEED_TYPE_BASE_CARD_STORE,
                                                base_card_store_iface_init)
                         G_ADD_PRIVATE (EosDiscoveryFeedKnowledgeAppCardStore))

enum {
  PROP_0,
  PROP_TITLE,
  PROP_URI,
  PROP_SYNOPSIS,
  PROP_THUMBNAIL,
  PROP_BUS_NAME,
  PROP_KNOWLEDGE_SEARCH_OBJECT_PATH,
  PROP_KNOWLEDGE_APP_ID,
  PROP_LAYOUT_DIRECTION,
  PROP_THUMBNAIL_SIZE,
  PROP_TYPE,
  NPROPS
};

static GParamSpec *eos_discovery_feed_knowledge_app_card_store_props [NPROPS] = { NULL, };

static void
eos_discovery_feed_knowledge_app_card_store_set_property (GObject      *object,
                                                          guint         prop_id,
                                                          const GValue *value,
                                                          GParamSpec   *pspec)
{
  EosDiscoveryFeedKnowledgeAppCardStore *store = EOS_DISCOVERY_FEED_KNOWLEDGE_APP_CARD_STORE (object);
  EosDiscoveryFeedKnowledgeAppCardStorePrivate *priv = eos_discovery_feed_knowledge_app_card_store_get_instance_private (store);

  switch (prop_id)
    {
    case PROP_TITLE:
      priv->title = g_value_dup_string (value);
      break;
    case PROP_URI:
      priv->uri = g_value_dup_string (value);
      break;
    case PROP_SYNOPSIS:
      priv->synopsis = g_value_dup_string (value);
      break;
    case PROP_THUMBNAIL:
      priv->thumbnail = g_value_dup_object (value);
      break;
    case PROP_BUS_NAME:
      priv->bus_name = g_value_dup_string (value);
      break;
    case PROP_KNOWLEDGE_SEARCH_OBJECT_PATH:
      priv->knowledge_search_object_path = g_value_dup_string (value);
      break;
    case PROP_KNOWLEDGE_APP_ID:
      priv->knowledge_app_id = g_value_dup_string (value);
      break;
    case PROP_LAYOUT_DIRECTION:
      priv->layout_direction = g_value_get_enum (value);
      break;
    case PROP_THUMBNAIL_SIZE:
      priv->thumbnail_size = g_value_get_uint (value);
      break;
    default:
      G_OBJECT_WARN_INVALID_PROPERTY_ID (object, prop_id, pspec);
    }
}

static void
eos_discovery_feed_knowledge_app_card_store_get_property (GObject    *object,
                                                          guint       prop_id,
                                                          GValue     *value,
                                                          GParamSpec *pspec)
{
  EosDiscoveryFeedKnowledgeAppCardStore *store = EOS_DISCOVERY_FEED_KNOWLEDGE_APP_CARD_STORE (object);
  EosDiscoveryFeedKnowledgeAppCardStorePrivate *priv = eos_discovery_feed_knowledge_app_card_store_get_instance_private (store);

  switch (prop_id)
    {
    case PROP_TYPE:
      g_value_set_enum (value, EOS_DISCOVERY_FEED_CARD_STORE_TYPE_ARTICLE_CARD);
      break;
    case PROP_TITLE:
      g_value_set_string (value, priv->title);
      break;
    case PROP_URI:
      g_value_set_string (value, priv->uri);
      break;
    case PROP_SYNOPSIS:
      g_value_set_string (value, priv->synopsis);
      break;
    case PROP_THUMBNAIL:
      g_value_set_object (value, priv->thumbnail);
      break;
    case PROP_BUS_NAME:
      g_value_set_string (value, priv->bus_name);
      break;
    case PROP_KNOWLEDGE_SEARCH_OBJECT_PATH:
      g_value_set_string (value, priv->knowledge_search_object_path);
      break;
    case PROP_KNOWLEDGE_APP_ID:
      g_value_set_string (value, priv->knowledge_app_id);
      break;
    case PROP_LAYOUT_DIRECTION:
      g_value_set_enum (value, priv->layout_direction);
      break;
    case PROP_THUMBNAIL_SIZE:
      g_value_set_uint (value, priv->thumbnail_size);
      break;
    default:
      G_OBJECT_WARN_INVALID_PROPERTY_ID (object, prop_id, pspec);
    }
}

static void
eos_discovery_feed_knowledge_app_card_store_finalize (GObject *object)
{
  EosDiscoveryFeedKnowledgeAppCardStore *store = EOS_DISCOVERY_FEED_KNOWLEDGE_APP_CARD_STORE (object);
  EosDiscoveryFeedKnowledgeAppCardStorePrivate *priv = eos_discovery_feed_knowledge_app_card_store_get_instance_private (store);

  g_clear_pointer (&priv->title, g_free);
  g_clear_pointer (&priv->uri, g_free);
  g_clear_pointer (&priv->synopsis, g_free);
  g_clear_pointer (&priv->bus_name, g_free);
  g_clear_pointer (&priv->knowledge_search_object_path, g_free);
  g_clear_pointer (&priv->knowledge_app_id, g_free);

  G_OBJECT_CLASS (eos_discovery_feed_knowledge_app_card_store_parent_class)->finalize (object);
}

static void
eos_discovery_feed_knowledge_app_card_store_dispose (GObject *object)
{
  EosDiscoveryFeedKnowledgeAppCardStore *store = EOS_DISCOVERY_FEED_KNOWLEDGE_APP_CARD_STORE (object);
  EosDiscoveryFeedKnowledgeAppCardStorePrivate *priv = eos_discovery_feed_knowledge_app_card_store_get_instance_private (store);

  g_clear_object (&priv->thumbnail);

  G_OBJECT_CLASS (eos_discovery_feed_knowledge_app_card_store_parent_class)->dispose (object);
}

static void
eos_discovery_feed_knowledge_app_card_store_init (EosDiscoveryFeedKnowledgeAppCardStore *store)
{
}

static void
base_card_store_iface_init (EosDiscoveryFeedBaseCardStoreInterface *iface)
{
}

static void
eos_discovery_feed_knowledge_app_card_store_class_init (EosDiscoveryFeedKnowledgeAppCardStoreClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);

  object_class->get_property = eos_discovery_feed_knowledge_app_card_store_get_property;
  object_class->set_property = eos_discovery_feed_knowledge_app_card_store_set_property;
  object_class->dispose = eos_discovery_feed_knowledge_app_card_store_dispose;
  object_class->finalize = eos_discovery_feed_knowledge_app_card_store_finalize;

  eos_discovery_feed_knowledge_app_card_store_props[PROP_TITLE] =
    g_param_spec_string ("title",
                         "Title of Card",
                         "The title of the card",
                         "",
                         G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY);

  eos_discovery_feed_knowledge_app_card_store_props[PROP_URI] =
    g_param_spec_string ("uri",
                         "URI of Content",
                         "The unique URI for the content in the app",
                         "",
                         G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY);

  eos_discovery_feed_knowledge_app_card_store_props[PROP_SYNOPSIS] =
    g_param_spec_string ("synopsis",
                         "Synopsis of Content",
                         "Brief description of content",
                         "",
                         G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY);

  eos_discovery_feed_knowledge_app_card_store_props[PROP_THUMBNAIL] =
    g_param_spec_object ("thumbnail",
                         "Content Thumbnail Stream",
                         "An input stream containing thumbnail image data",
                         G_TYPE_INPUT_STREAM,
                         G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY);

  eos_discovery_feed_knowledge_app_card_store_props[PROP_BUS_NAME] =
    g_param_spec_string ("bus-name",
                         "Bus Name",
                         "The bus name for the app",
                         "",
                         G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY);

  eos_discovery_feed_knowledge_app_card_store_props[PROP_KNOWLEDGE_SEARCH_OBJECT_PATH] =
    g_param_spec_string ("knowledge-search-object-path",
                         "Knowledge Search Object Path",
                         "Object path for search object",
                         "",
                         G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY);

  eos_discovery_feed_knowledge_app_card_store_props[PROP_KNOWLEDGE_APP_ID] =
    g_param_spec_string ("knowledge-app-id",
                         "Knowledge App ID",
                         "App ID for corresponding Knowledge App",
                         "",
                         G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY);

  eos_discovery_feed_knowledge_app_card_store_props[PROP_LAYOUT_DIRECTION] =
    g_param_spec_enum ("layout-direction",
                       "Layout Direction",
                       "The direction in which to layout the card content",
                       EOS_TYPE_DISCOVERY_FEED_CARD_LAYOUT_DIRECTION,
                       EOS_DISCOVERY_FEED_CARD_LAYOUT_DIRECTION_IMAGE_FIRST,
                       G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY);

  eos_discovery_feed_knowledge_app_card_store_props[PROP_THUMBNAIL_SIZE] =
    g_param_spec_uint ("thumbnail-size",
                       "Thumbnail Size",
                       "How big, in square pixels, the thumbnails are",
                       EOS_DISCOVERY_FEED_THUMBNAIL_SIZE_APP_STORE,
                       EOS_DISCOVERY_FEED_THUMBNAIL_SIZE_ARTWORK,
                       EOS_DISCOVERY_FEED_THUMBNAIL_SIZE_ARTICLE,
                       G_PARAM_READWRITE | G_PARAM_CONSTRUCT_ONLY);

  g_object_class_install_properties (object_class,
                                     PROP_TYPE,
                                     eos_discovery_feed_knowledge_app_card_store_props);

  g_object_class_override_property (object_class,
                                    PROP_TYPE,
                                    "type");
}

EosDiscoveryFeedKnowledgeAppCardStore *
eos_discovery_feed_knowledge_app_card_store_new (const gchar                         *title,
                                                 const gchar                         *uri,
                                                 const gchar                         *synopsis,
                                                 GInputStream                        *thumbnail,
                                                 const gchar                         *desktop_id,
                                                 const gchar                         *bus_name,
                                                 const gchar                         *knowledge_search_object_path,
                                                 const gchar                         *knowledge_app_id,
                                                 EosDiscoveryFeedCardLayoutDirection  layout_direction,
                                                 guint                                thumbnail_size)
{
  return g_object_new (EOS_DISCOVERY_FEED_TYPE_KNOWLEDGE_APP_CARD_STORE,
                       "title", title,
                       "uri", uri,
                       "synopsis", synopsis,
                       "thumbnail", thumbnail,
                       "desktop-id", desktop_id,
                       "bus-name", bus_name,
                       "knowledge-search-object-path", knowledge_search_object_path,
                       "knowledge-app-id", knowledge_app_id,
                       "layout-direction", layout_direction,
                       "thumbnail-size", thumbnail_size,
                       NULL);
}
