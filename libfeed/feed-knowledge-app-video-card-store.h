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

#pragma once

#include <gio/gio.h>
#include <glib-object.h>

#include <feed-knowledge-app-card-store.h>

G_BEGIN_DECLS

#define EOS_DISCOVERY_FEED_TYPE_KNOWLEDGE_APP_VIDEO_CARD_STORE eos_discovery_feed_knowledge_app_video_card_store_get_type ()
G_DECLARE_FINAL_TYPE (EosDiscoveryFeedKnowledgeAppVideoCardStore, eos_discovery_feed_knowledge_app_video_card_store, EOS_DISCOVERY_FEED, KNOWLEDGE_APP_VIDEO_CARD_STORE, EosDiscoveryFeedKnowledgeAppCardStore)

EosDiscoveryFeedKnowledgeAppVideoCardStore * eos_discovery_feed_knowledge_app_video_card_store_new (const gchar  *title,
                                                                                                    const gchar  *uri,
                                                                                                    const gchar  *duration,
                                                                                                    GInputStream *thumbnail,
                                                                                                    const gchar  *desktop_id,
                                                                                                    const gchar  *bus_name,
                                                                                                    const gchar  *knowledge_search_object_path,
                                                                                                    const gchar  *knowledge_app_id,
                                                                                                    const gchar  *thumbnail_uri);

G_END_DECLS
