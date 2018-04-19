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

#include <gio/gio.h>

#include "feed-all-async-tasks-private.h"

struct _AllTasksResultsClosure
{
  GPtrArray      *results;
  guint           remaining;
  GTask          *task;
};

AllTasksResultsClosure *
all_tasks_results_closure_new (GDestroyNotify      result_free_func,
                               GAsyncReadyCallback callback,
                               gpointer            user_data)
{
  AllTasksResultsClosure *closure = g_new0 (AllTasksResultsClosure, 1);

  closure->results = g_ptr_array_new_with_free_func (result_free_func);
  closure->remaining = 0;
  closure->task = g_task_new (NULL, NULL, callback, user_data);

  return closure;
}

static void
all_tasks_results_closure_free (AllTasksResultsClosure *closure)
{
  g_clear_pointer (&closure->results, g_ptr_array_unref);
  g_clear_pointer (&closure->task, g_object_unref);

  g_free (closure);
}

static guint
all_tasks_results_closure_allocate_new_result_slot (AllTasksResultsClosure *closure)
{
  guint last_len = closure->results->len;
  g_ptr_array_set_size (closure->results, closure->results->len + 1);
  ++closure->remaining;

  return last_len;
}

static void
all_tasks_results_register_result (AllTasksResultsClosure *closure,
                                   GAsyncResult           *result,
                                   guint                   index)
{
  g_return_if_fail (closure->remaining > 0);

  g_ptr_array_index (closure->results, index) = g_object_ref (result);

  if (--closure->remaining == 0)
    {
      /* This will call into the callback immediately, since results
       * are registered in a different main context iteration */
      g_task_return_pointer (closure->task,
                             g_steal_pointer (&closure->results),
                             (GDestroyNotify) g_ptr_array_unref);
      all_tasks_results_closure_free (closure);
    }
}

struct _IndividualTaskResultClosure
{
  guint                   index;
  AllTasksResultsClosure *all_tasks_closure; /* non-owning reference */
};

IndividualTaskResultClosure *
individual_task_result_closure_new (AllTasksResultsClosure *all_tasks_closure)
{
  IndividualTaskResultClosure *closure = g_new0 (IndividualTaskResultClosure, 1);

  closure->all_tasks_closure = all_tasks_closure;
  closure->index = all_tasks_results_closure_allocate_new_result_slot (all_tasks_closure);

  return closure;
}

static void
individual_task_result_closure_free (IndividualTaskResultClosure *closure)
{
  g_free (closure);
}

G_DEFINE_AUTOPTR_CLEANUP_FUNC (IndividualTaskResultClosure,
                               individual_task_result_closure_free)

void
individual_task_result_completed (GObject      *source,
                                  GAsyncResult *result,
                                  gpointer      user_data)
{
  g_autoptr(IndividualTaskResultClosure) closure = user_data;

  all_tasks_results_register_result (closure->all_tasks_closure,
                                     result,
                                     closure->index);
}

