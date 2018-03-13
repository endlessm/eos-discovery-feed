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

#include "feed-knowledge-app-news-card-store.h"
#include "feed-knowledge-app-card-store.h"
#include "feed-sizes.h"

struct _EosDiscoveryFeedKnowledgeAppNewsCardStore
{
  GObject parent_instance;
};

static void base_card_store_iface_init (EosDiscoveryFeedBaseCardStoreInterface *iface);

G_DEFINE_TYPE_WITH_CODE (EosDiscoveryFeedKnowledgeAppNewsCardStore,
                         eos_discovery_feed_knowledge_app_news_card_store,
                         EOS_DISCOVERY_FEED_TYPE_KNOWLEDGE_APP_CARD_STORE,
                         G_IMPLEMENT_INTERFACE (EOS_DISCOVERY_FEED_TYPE_BASE_CARD_STORE,
                                                base_card_store_iface_init))

enum {
  PROP_0,
  PROP_TYPE,
  NPROPS
};

static GParamSpec *eos_discovery_feed_knowledge_app_news_card_store_props [NPROPS] = { NULL, };

static void
eos_discovery_feed_knowledge_app_news_card_store_get_property (GObject    *object,
                                                               guint       prop_id,
                                                               GValue     *value,
                                                               GParamSpec *pspec)
{
  EosDiscoveryFeedKnowledgeAppNewsCardStore *store = EOS_DISCOVERY_FEED_KNOWLEDGE_APP_NEWS_CARD_STORE (object);

  switch (prop_id)
    {
    case PROP_TYPE:
      g_value_set_enum (value, EOS_DISCOVERY_FEED_CARD_STORE_TYPE_NEWS_CARD);
      break;
    default:
      G_OBJECT_WARN_INVALID_PROPERTY_ID (object, prop_id, pspec);
    }
}

static void
eos_discovery_feed_knowledge_app_news_card_store_init (EosDiscoveryFeedKnowledgeAppNewsCardStore *store)
{
}

static void
base_card_store_iface_init (EosDiscoveryFeedBaseCardStoreInterface *iface)
{
}

static void
eos_discovery_feed_knowledge_app_news_card_store_class_init (EosDiscoveryFeedKnowledgeAppNewsCardStoreClass *klass)
{
  GObjectClass *object_class = G_OBJECT_CLASS (klass);

  object_class->get_property = eos_discovery_feed_knowledge_app_news_card_store_get_property;

  g_object_class_override_property (object_class,
                                    PROP_TYPE,
                                    "type");
}

EosDiscoveryFeedKnowledgeAppNewsCardStore *
eos_discovery_feed_knowledge_app_news_card_store_new (const gchar                         *title,
                                                      const gchar                         *uri,
                                                      const gchar                         *synopsis,
                                                      GInputStream                        *thumbnail,
                                                      const gchar                         *desktop_id,
                                                      const gchar                         *bus_name,
                                                      const gchar                         *knowledge_search_object_path,
                                                      const gchar                         *knowledge_app_news_id,
                                                      EosDiscoveryFeedCardLayoutDirection  layout_direction,
                                                      guint                                thumbnail_size)
{
  return g_object_new (EOS_DISCOVERY_FEED_TYPE_KNOWLEDGE_APP_NEWS_CARD_STORE,
                       "title", title,
                       "uri", uri,
                       "synopsis", synopsis,
                       "thumbnail", thumbnail,
                       "desktop-id", desktop_id,
                       "bus-name", bus_name,
                       "knowledge-search-object-path", knowledge_search_object_path,
                       "knowledge-app-id", knowledge_app_news_id,
                       "layout-direction", layout_direction,
                       "thumbnail-size", thumbnail_size,
                       NULL);
}
