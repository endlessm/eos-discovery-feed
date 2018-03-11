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

#include <glib-object.h>

#include <feed-base-card-store.h>
#include <feed-word-card-store.h>
#include <feed-quote-card-store.h>

G_BEGIN_DECLS

#define EOS_DISCOVERY_FEED_TYPE_WORD_QUOTE_CARD_STORE eos_discovery_feed_word_quote_card_store_get_type ()
G_DECLARE_FINAL_TYPE (EosDiscoveryFeedWordQuoteCardStore, eos_discovery_feed_word_quote_card_store, EOS_DISCOVERY_FEED, WORD_QUOTE_CARD_STORE, GObject)

EosDiscoveryFeedWordQuoteCardStore * eos_discovery_feed_word_quote_card_store_new (EosDiscoveryFeedWordCardStore *word_store,
                                                                                   EosDiscoveryFeedQuoteCardStore *quote_store);

G_END_DECLS
