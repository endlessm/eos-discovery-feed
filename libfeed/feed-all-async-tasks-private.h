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

G_BEGIN_DECLS

/**
 * SECTION:all-async-tasks
 * @title: All Async Tasks
 * @short_description: Helpers for running groups of Async tasks together
 *
 * These helpers are essentially an intrusive version of Promise.all
 * over a group of #GTask . It works by defining two sets of closures. First
 * there is a closure for holding all the pending tasks, with a
 * #GAsyncReadyCallback invoked when each task has completed execution.
 * Then, there is a closure for each individual task, which updates the
 * state of the corresponding #AllTasksResultsClosure when an individual
 * task completes (either successfully or on error). The system assumes that
 * the corresponding callback for each task will be called. Importantly, no
 * single failure causes the set of tasks to fail and all tasks are executed
 * concurrently.
 *
 * When all the tasks have completed running, each #GAsyncResult is passed
 * as a #GPtrArray to the #GAsyncReadyCallback specified in
 * all_tasks_results_closure_new.
 *
 * The caller that sets up all the async tasks must call
 * all_tasks_results_return_now() once it is done with whatever would add async
 * tasks and no async tasks were actually added. That will cause the closure
 * to return on the next idle if there were no tasks to be done. Otherwise,
 * #AllTasksResultsClosure will wait indefinitely for a task to be added.
 *
 * Callers generally should not add more tasks to the closure once
 * all_tasks_results_maybe_return_now() has been called
 * as there is a potential for a race condition where the closure
 * will return on the next idle if no tasks were registered before even
 * if it would strictly-speaking have work to do on the next idle tick.
 *
 * You would use the code in this way:
 *
 * {{{
 *
 *     static void
 *     on_all_tasks_finished (GObject      *source,
 *                            GAsyncResult *result,
 *                            gpointer      user_data)
 *     {
 *       g_autoptr(GTask) task = user_data;
 *       g_autoptr(GError) local_error = NULL;
 *       g_autoptr(GPtrArray) results = g_task_propagate_pointer (G_TASK (result),
 *                                                                &local_error);
 *       guint i = 0;
 *
 *       if (!results)
 *         {
 *           g_task_return_error (task, g_steal_pointer (&local_error));
 *           return;
 *         }
 *
 *       for (; i < results->len; ++i)
 *         {
 *           g_autoptr(GError) individual_task_error = NULL;
 *           GTask *task = G_TASK (g_ptr_array_index (results, i));
 *           gpointer task_result = g_task_propagate_pointer (task, &local_error);
 *
 *           if (task_result == NULL)
 *             {
 *               ... do something about individual task failure ...
 *               continue;
 *             }
 *
 *           ... do something with individaul task result ...
 *         }
 *
 *         g_task_return_pointer (task, ...);
 *     }
 *
 *    static void
 *    launch_concurrent_tasks (GCancellable        *cancellable,
                               GAsyncReadyCallback  callback,
 *                             gpointer             user_data)
 *    {
 *      g_autoptr(GTask) task = g_task_new (NULL, cancellable, callback, user_data);
 *      AllTasksResultsClosure *all_tasks_closure = all_tasks_results_closure_new (g_object_unref,
 *                                                                                 on_all_tasks_finished,
 *                                                                                 g_object_ref (task));
 *
 *      launch_some_task (cancellable,
 *                        individual_task_result_completed,
 *                        individual_task_result_closure_new (all_tasks_closure));
 *
 *      launch_other_some_task (cancellable,
 *                              individual_task_result_completed,
 *                              individual_task_result_closure_new (all_tasks_closure));
 *
 *      if (!all_tasks_results_has_tasks_remaining (all_tasks_closure))
 *        all_tasks_results_return_now (all_tasks_closure);
 *    }
 *
 * }}}
 */
typedef struct _AllTasksResultsClosure AllTasksResultsClosure;
typedef struct _IndividualTaskResultClosure IndividualTaskResultClosure;

AllTasksResultsClosure * all_tasks_results_closure_new (GDestroyNotify      result_free_func,
                                                        GAsyncReadyCallback callback,
                                                        gpointer            user_data);
gboolean all_tasks_results_has_tasks_remaining (AllTasksResultsClosure *closure);
void all_tasks_results_return_now (AllTasksResultsClosure *closure);

IndividualTaskResultClosure * individual_task_result_closure_new (AllTasksResultsClosure *all_tasks_closure);

void individual_task_result_completed (GObject      *source,
                                       GAsyncResult *result,
                                       gpointer      user_data);

G_END_DECLS

