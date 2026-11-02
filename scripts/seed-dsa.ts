import 'dotenv/config';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const DSA_TOPICS = [
    {
        name: "Arrays - Fundamentals",
        priority: 3,
        content: `
Arrays - Core Concepts and Techniques

1. WHAT IS AN ARRAY
An array is a contiguous block of memory storing elements of the same type. Elements are accessed by index in O(1) time. Arrays have fixed size in most languages (dynamic arrays like ArrayList/vector resize by doubling capacity).

2. TIME COMPLEXITIES
- Access by index: O(1)
- Search (unsorted): O(n)
- Search (sorted): O(log n) with binary search
- Insert at end: O(1) amortized for dynamic arrays
- Insert at position: O(n) — shifts elements
- Delete at position: O(n) — shifts elements

3. TWO POINTER TECHNIQUE
Use two pointers (left and right) moving towards each other or in the same direction.
- Two Sum (sorted array): left=0, right=n-1. If sum < target, move left++. If sum > target, move right--.
- Remove duplicates from sorted array: slow and fast pointer. Fast scans ahead, slow marks position for next unique element.
- Container with most water: left=0, right=n-1. Area = min(height[l], height[r]) * (r-l). Move the shorter side inward.
- Trapping rainwater: For each bar, water = min(maxLeft, maxRight) - height[i]. Can be solved with two pointers in O(n) time O(1) space.

4. SLIDING WINDOW
Fixed or variable size window that slides across the array.
- Fixed window: Maintain sum/count of window of size k. Slide by adding right element and removing left element.
- Variable window: Expand right until condition breaks, then shrink left.
- Maximum sum subarray of size k: Slide window of size k, track max sum.
- Longest substring without repeating characters: Variable window with HashSet.
- Minimum window substring: Variable window, expand right to include all target chars, shrink left to minimize.

5. KADANE'S ALGORITHM
Find maximum sum contiguous subarray in O(n).
Algorithm: currentMax = max(arr[i], currentMax + arr[i]). globalMax = max(globalMax, currentMax).
Handles negative numbers. If all negative, returns the largest negative number.
Variant: To find the actual subarray, track start and end indices.

6. PREFIX SUM
preSum[i] = arr[0] + arr[1] + ... + arr[i].
Range sum query: sum(l, r) = preSum[r] - preSum[l-1].
Build in O(n), query in O(1).
2D prefix sum: preSum[i][j] = sum of rectangle from (0,0) to (i,j).

7. DUTCH NATIONAL FLAG (Sort 0s, 1s, 2s)
Three pointers: low=0, mid=0, high=n-1.
If arr[mid]==0: swap(arr[low], arr[mid]), low++, mid++.
If arr[mid]==1: mid++.
If arr[mid]==2: swap(arr[mid], arr[high]), high--.
Time: O(n), Space: O(1).

8. MOORE'S VOTING ALGORITHM
Find majority element (appears > n/2 times).
Maintain candidate and count. If count==0, new candidate. If same as candidate, count++. Else count--.
The candidate at end is the majority element (verify with second pass).

9. NEXT PERMUTATION
Step 1: Find largest i such that arr[i] < arr[i+1] (from right).
Step 2: Find largest j such that arr[j] > arr[i].
Step 3: Swap arr[i] and arr[j].
Step 4: Reverse from i+1 to end.
If no such i exists, array is last permutation — reverse entire array.

10. MATRIX PROBLEMS
- Rotate matrix 90° clockwise: Transpose + Reverse each row.
- Spiral traversal: Maintain top, bottom, left, right boundaries. Traverse right→down→left→up, shrinking boundaries.
- Set matrix zeros: Use first row and first column as markers.
- Search in sorted matrix: Start from top-right. If target < current, go left. If target > current, go down. O(m+n).
`
    },
    {
        name: "Sorting Algorithms",
        priority: 2,
        content: `
Sorting Algorithms - Complete Reference

1. BUBBLE SORT
Compare adjacent elements and swap if out of order. Repeat n-1 passes.
Optimization: If no swaps in a pass, array is sorted — break early.
Time: O(n²) worst/average, O(n) best (already sorted). Space: O(1). Stable: Yes.

2. SELECTION SORT
Find minimum element in unsorted portion, swap with first unsorted position.
Time: O(n²) always. Space: O(1). Stable: No.
Why not stable? Example: [4a, 4b, 1] → after first pass [1, 4b, 4a] — order of 4s changed.

3. INSERTION SORT
Take each element and insert it into its correct position in the sorted portion.
Time: O(n²) worst/average, O(n) best. Space: O(1). Stable: Yes.
Best for nearly sorted arrays and small arrays. Used within TimSort.

4. MERGE SORT
Divide array in half recursively until single elements. Merge sorted halves.
Merge: Compare front elements of both halves, pick smaller, advance that pointer.
Time: O(n log n) always. Space: O(n). Stable: Yes.
Used for external sorting (sorting data that doesn't fit in memory).

5. QUICK SORT
Choose pivot. Partition: elements < pivot go left, elements > pivot go right.
Recursively sort left and right partitions.
Pivot selection: Last element, random, median-of-three.
Lomuto partition: Single pointer scan from left.
Hoare partition: Two pointers from both ends — more efficient.
Time: O(n log n) average, O(n²) worst (sorted array + bad pivot). Space: O(log n) stack. Stable: No.
Randomized quicksort avoids worst case.

6. HEAP SORT
Build max-heap from array. Repeatedly extract max (swap with last, heapify down).
Time: O(n log n) always. Space: O(1). Stable: No.
Heapify: Compare node with children, swap with larger child, repeat downward.
Build heap: Start from last non-leaf node (n/2 - 1), heapify each. O(n) time.

7. COUNTING SORT
Count occurrences of each value. Calculate cumulative counts. Place elements in output.
Time: O(n + k) where k = range of values. Space: O(k). Stable: Yes.
Only works for non-negative integers with limited range.

8. RADIX SORT
Sort by each digit from least significant to most significant using counting sort.
Time: O(d * (n + k)) where d = digits, k = base (usually 10). Space: O(n + k). Stable: Yes.

9. KEY COMPARISONS
| Algorithm  | Best    | Average  | Worst    | Space  | Stable |
|-----------|---------|----------|----------|--------|--------|
| Bubble    | O(n)    | O(n²)   | O(n²)   | O(1)   | Yes    |
| Selection | O(n²)   | O(n²)   | O(n²)   | O(1)   | No     |
| Insertion | O(n)    | O(n²)   | O(n²)   | O(1)   | Yes    |
| Merge     | O(nlogn)| O(nlogn) | O(nlogn) | O(n)   | Yes    |
| Quick     | O(nlogn)| O(nlogn) | O(n²)   | O(logn) | No     |
| Heap      | O(nlogn)| O(nlogn) | O(nlogn) | O(1)   | No     |

10. WHEN TO USE WHICH
- Small n (< 20): Insertion sort
- Nearly sorted: Insertion sort or Bubble sort
- Guaranteed O(n log n): Merge sort
- Average fastest in practice: Quick sort (with random pivot)
- No extra space needed: Heap sort
- Limited range integers: Counting sort
- Stability required: Merge sort
`
    },
    {
        name: "Binary Search",
        priority: 3,
        content: `
Binary Search - Patterns and Variations

1. STANDARD BINARY SEARCH
Search for target in sorted array.
low=0, high=n-1. While low <= high: mid = low + (high-low)/2.
If arr[mid] == target: return mid.
If arr[mid] < target: low = mid + 1.
If arr[mid] > target: high = mid - 1.
Time: O(log n). Space: O(1).
Why mid = low + (high-low)/2 instead of (low+high)/2? Prevents integer overflow.

2. LOWER BOUND
Find first position where arr[pos] >= target.
If arr[mid] >= target: result = mid, high = mid - 1.
Else: low = mid + 1.
Returns leftmost valid position. Useful for: first occurrence, insert position.

3. UPPER BOUND
Find first position where arr[pos] > target.
If arr[mid] > target: result = mid, high = mid - 1.
Else: low = mid + 1.

4. FIRST AND LAST OCCURRENCE
First: Lower bound of target = first occurrence (verify arr[pos] == target).
Last: Upper bound of target - 1 = last occurrence.
Or: Modified binary search — when found, continue searching left (for first) or right (for last).

5. SEARCH IN ROTATED SORTED ARRAY
Array was sorted then rotated. Example: [4,5,6,7,0,1,2].
At each step, one half is always sorted.
If left half sorted (arr[low] <= arr[mid]):
  If target in [arr[low], arr[mid]]: search left. Else search right.
If right half sorted:
  If target in [arr[mid], arr[high]]: search right. Else search left.

6. FINDING MINIMUM IN ROTATED SORTED ARRAY
If arr[mid] > arr[high]: minimum is in right half. low = mid + 1.
If arr[mid] <= arr[high]: minimum is in left half (including mid). high = mid.
Return arr[low].

7. BINARY SEARCH ON ANSWER
When the answer lies in a range and you can verify if a value works:
Pattern: low = minAnswer, high = maxAnswer.
Check if mid works. If yes, try smaller (high = mid). If no, try larger (low = mid + 1).

Examples:
- Koko eating bananas: Binary search on eating speed (1 to max pile).
- Minimum days to make bouquets: Binary search on days.
- Split array largest sum: Binary search on the maximum sum. Check if can split into k parts with max sum <= mid.
- Aggressive cows: Binary search on minimum distance.
- Allocate books: Binary search on maximum pages per student.
- Painter's partition: Binary search on maximum work per painter.

8. SQUARE ROOT
Binary search on answer: low=0, high=n. If mid*mid <= n, it could be answer (low = mid+1). Else high = mid-1.
For decimal precision: Continue with floating point binary search.

9. MEDIAN OF TWO SORTED ARRAYS
Binary search on the smaller array. Partition both arrays such that left half has (n1+n2+1)/2 elements.
Check if maxLeft1 <= minRight2 and maxLeft2 <= minRight1.
Time: O(log(min(n1,n2))).

10. PEAK ELEMENT
If arr[mid] > arr[mid+1]: peak is in left half (including mid). high = mid.
Else: peak is in right half. low = mid + 1.
Works because array implicitly has -infinity at boundaries.
`
    },
    {
        name: "Linked Lists",
        priority: 2,
        content: `
Linked Lists - Operations and Patterns

1. SINGLY LINKED LIST
Each node has: data + pointer to next node. Last node points to null.
Advantages over arrays: O(1) insertion/deletion at known position, no resizing needed.
Disadvantages: No random access (O(n) to reach index i), extra memory for pointers.

2. BASIC OPERATIONS
- Traverse: Start from head, follow next pointers. O(n).
- Insert at head: newNode.next = head; head = newNode. O(1).
- Insert at tail: Traverse to last node, last.next = newNode. O(n). O(1) with tail pointer.
- Insert at position: Traverse to position-1, adjust pointers. O(n).
- Delete node: prev.next = node.next. O(n) to find, O(1) to delete.
- Delete by value: Find node with value, adjust previous pointer.

3. REVERSE A LINKED LIST
Iterative: Three pointers — prev=null, curr=head, next.
While curr: next=curr.next, curr.next=prev, prev=curr, curr=next.
Head = prev. Time: O(n), Space: O(1).
Recursive: reverse(head.next) first, then head.next.next = head, head.next = null.

4. FAST AND SLOW POINTER (TORTOISE AND HARE)
- Detect cycle: Slow moves 1 step, fast moves 2 steps. If they meet, cycle exists.
- Find cycle start: After detection, move one pointer to head. Both move 1 step. Meeting point = cycle start.
  Proof: If cycle starts at distance a from head, and meeting point is b from cycle start, then a = c-b (where c = cycle length).
- Find middle: When fast reaches end, slow is at middle.
  For even length: slow will be at the first of two middle nodes (use fast.next && fast.next.next for second middle).
- Check palindrome: Find middle, reverse second half, compare, restore (optional).

5. MERGE TWO SORTED LISTS
Create dummy head. Compare current nodes of both lists, attach smaller one.
Time: O(n+m), Space: O(1) extra.
Recursive: If l1.val < l2.val, l1.next = merge(l1.next, l2), return l1.

6. REMOVE NTH NODE FROM END
Two pointer: Move fast pointer n steps ahead. Then move both until fast reaches end.
Slow is now at (n+1)th from end. Remove slow.next.
Edge case: If fast is null after n steps, remove head.

7. INTERSECTION OF TWO LISTS
Method 1: Get lengths. Advance longer list by difference. Then move together until meeting.
Method 2: Two pointers — when a reaches end, redirect to headB. When b reaches end, redirect to headA. They meet at intersection or null.

8. DOUBLY LINKED LIST
Each node has: data + next + prev pointers.
Advantages: O(1) deletion when node reference is given (no need to find prev).
Used in: LRU Cache, Browser history.

9. FLATTEN A LINKED LIST
Multiple levels of linked lists (child pointer + next pointer).
DFS approach: When child exists, insert child list between current and next.
Or use stack: Push next, process child, reconnect.

10. LRU CACHE
Combination of HashMap + Doubly Linked List.
HashMap: key → node reference for O(1) access.
DLL: Most recently used at head, least recently used at tail.
get(key): Move to front, return value. O(1).
put(key, value): If exists, update and move to front. If new and at capacity, remove tail. Add to front. O(1).
`
    },
    {
        name: "Stacks & Queues",
        priority: 2,
        content: `
Stacks and Queues - Concepts and Problems

1. STACK (LIFO - Last In First Out)
Operations: push(x), pop(), peek/top(), isEmpty(). All O(1).
Implementation: Array (fixed size) or Linked List (dynamic).
Applications: Function call stack, undo operations, expression evaluation, backtracking.

2. QUEUE (FIFO - First In First Out)
Operations: enqueue(x), dequeue(), front(), isEmpty(). All O(1).
Circular queue: Uses modular arithmetic to wrap around array. front = (front+1) % size.
Deque (Double-ended queue): Insert/delete from both ends. Used in sliding window maximum.

3. VALID PARENTHESES
Push opening brackets. For closing bracket, check if top matches. If not, invalid.
After processing, stack should be empty.
Mapping: ')' matches '(', ']' matches '[', '}' matches '{'.

4. NEXT GREATER ELEMENT
For each element, find the next element that is greater.
Stack approach (right to left): Maintain stack of elements seen.
Pop all elements <= current. Stack top is the next greater. Push current.
Time: O(n), Space: O(n).
Variant: Next greater to the left — process left to right.
Variant: Circular array — process array twice (index % n).

5. STOCK SPAN PROBLEM
For each day, find how many consecutive days before had price ≤ today.
Stack stores indices of days with higher prices.
Span = current_index - stack.top(). Similar to next greater to the left.

6. LARGEST RECTANGLE IN HISTOGRAM
For each bar, find how far it can extend left and right.
Use stack to find previous smaller and next smaller elements.
Area for bar i = height[i] * (nextSmaller[i] - prevSmaller[i] - 1).
Time: O(n), Space: O(n).

7. MIN STACK
Stack that supports getMin() in O(1).
Approach 1: Extra stack storing minimums. Push to min stack when new min.
Approach 2: Store (value, currentMin) pairs.
Approach 3: Store modified values — if val < min, push 2*val - min, update min. On pop, if top < min, actual min was 2*min - top.

8. IMPLEMENT QUEUE USING STACKS
Two stacks: inbox and outbox.
Enqueue: Push to inbox.
Dequeue: If outbox empty, pour all from inbox to outbox. Pop from outbox.
Amortized O(1) per operation.

9. IMPLEMENT STACK USING QUEUES
Method 1 (push costly): Use two queues. Push to q2, pour q1 into q2, swap.
Method 2 (pop costly): Push normally. For pop, move all except last to other queue.
Method 3 (single queue): After push, rotate queue n-1 times.

10. MONOTONIC STACK
Stack where elements are in increasing or decreasing order.
Used in: Next greater/smaller element, stock span, histogram, trapping rainwater.
Pattern: While stack not empty and current element breaks monotonicity, pop and process.

11. SLIDING WINDOW MAXIMUM
Use deque storing indices. Maintain decreasing order in deque.
For each element: Remove indices outside window. Remove smaller elements from back.
Front of deque = maximum of current window.
Time: O(n), Space: O(k).

12. CELEBRITY PROBLEM
A celebrity is known by everyone but knows no one.
Stack approach: Push all. Pop two, eliminate one (if A knows B, A is not celebrity; else B is not).
Last remaining is candidate — verify with full check. Time O(n).
`
    },
    {
        name: "Recursion & Backtracking",
        priority: 2,
        content: `
Recursion and Backtracking

1. RECURSION BASICS
A function that calls itself. Must have: base case (termination) + recursive case (progress toward base).
Every recursive solution can be converted to iterative using a stack.
Stack overflow: Too many recursive calls exceed call stack limit (~10,000 in most languages).
Tail recursion: Recursive call is the last operation. Can be optimized by compiler to iteration.

2. RECURSION THINKING
Step 1: Define what the function does (trust it works for smaller inputs).
Step 2: Find the base case (smallest input).
Step 3: Find the relation between the problem and subproblem.
Example: factorial(n) = n * factorial(n-1). Base: factorial(0) = 1.

3. SUBSEQUENCES / SUBSETS (Power Set)
For each element, two choices: include or exclude.
Generate all 2^n subsets.
Pattern: f(index, current): if index==n, add current to result. Else: include arr[index] and recurse, exclude and recurse.
Time: O(2^n), Space: O(n) stack.

4. PERMUTATIONS
Approach 1: Swap each element with current position, recurse on rest.
Approach 2: Use boolean visited array. Pick unvisited elements.
For permutations with duplicates: Sort first, skip if arr[i] == arr[i-1] and prev not used.
Time: O(n! * n).

5. COMBINATION SUM
Find combinations that sum to target. Elements can be reused.
f(index, target, current): if target == 0, add current. if target < 0 or index == n, return.
Include arr[index] (don't advance index for reuse) or skip (advance index).
Variant: Each element used once — advance index after including.
Variant: Fixed size k — additional constraint on combination length.

6. N-QUEENS
Place n queens on n×n board so no two attack each other.
Backtracking: Try placing queen in each column of current row.
Check validity: No queen in same column, same diagonal (\\ and /).
Optimization: Use sets/arrays for columns, diagonal1 (row-col), diagonal2 (row+col).
Time: O(n!), solutions exist for n ≥ 4.

7. SUDOKU SOLVER
Backtracking: Find empty cell, try digits 1-9.
Check validity: No repeat in row, column, or 3x3 box.
If valid, place and recurse. If dead end, remove (backtrack).
Box index: (row/3)*3 + col/3.

8. RAT IN A MAZE
Find all paths from (0,0) to (n-1,n-1) in a maze.
Backtracking: Try all 4 directions (Down, Left, Right, Up — sorted for lexicographic order).
Mark visited to avoid cycles. Unmark when backtracking.

9. WORD SEARCH
Find if word exists in 2D grid by moving to adjacent cells.
Backtracking: Starting from each cell matching first character, try all 4 directions.
Mark visited (change to '#'), recurse, restore.

10. PALINDROME PARTITIONING
Find all ways to partition string into palindromic substrings.
Backtracking: For each position, try all possible cuts. If prefix is palindrome, recurse on suffix.
Check palindrome: Two pointer from both ends.

11. SUBSET SUM
Does a subset with given sum exist?
Backtracking: Include/exclude each element. Optimization: Sort desc and prune when sum exceeds target.
DP approach: dp[i] = true if sum i is achievable. For each num, update right to left.
`
    },
    {
        name: "Trees - Binary & BST",
        priority: 3,
        content: `
Trees - Binary Trees and Binary Search Trees

1. BINARY TREE BASICS
Each node has at most 2 children (left, right). Root is the topmost node.
Leaf: Node with no children. Height: Longest path from root to leaf.
Full BT: Every node has 0 or 2 children.
Complete BT: All levels full except possibly last (filled left to right).
Perfect BT: All interior nodes have 2 children, all leaves at same level.
Number of nodes in perfect BT of height h: 2^(h+1) - 1.

2. TREE TRAVERSALS
Inorder (Left, Root, Right): Gives sorted order for BST.
Preorder (Root, Left, Right): Used for serialization, creating copy.
Postorder (Left, Right, Root): Used for deletion, calculating size.
Level order (BFS): Use queue. Process level by level.
Iterative inorder: Use stack. Go left as far as possible, pop and process, move right.
Morris traversal: O(1) space inorder using threaded links. Connect rightmost node of left subtree to current.

3. BINARY TREE PROBLEMS
- Height/Depth: max(leftHeight, rightHeight) + 1. Base: null → 0.
- Diameter: Longest path between any two nodes = leftHeight + rightHeight at each node. Track maximum.
- Check balanced: |leftHeight - rightHeight| <= 1 at every node. Return -1 if unbalanced.
- Maximum path sum: At each node, max path through node = node.val + max(0, leftMax) + max(0, rightMax).
- Identical trees: Both null → true. One null → false. Values equal and left subtrees identical and right subtrees identical.
- Mirror/Symmetric: Left subtree is mirror of right subtree. Compare left.left with right.right and left.right with right.left.
- Lowest Common Ancestor: If root is p or q, return root. Recurse left and right. If both return non-null, root is LCA. Else return non-null side.

4. VIEWS OF BINARY TREE
- Left view: First node at each level (BFS, take first of each level).
- Right view: Last node at each level.
- Top view: Use horizontal distance. BFS with HD. First occurrence of each HD.
- Bottom view: Last occurrence of each HD.
- Vertical order: Group by HD, within same HD sort by level then left-to-right.

5. BINARY SEARCH TREE (BST)
Property: left.val < node.val < right.val for all nodes.
Search: O(h). If target < node, go left. If target > node, go right.
Insert: Search for position, insert as leaf. O(h).
Delete: Case 1: Leaf — remove. Case 2: One child — replace with child. Case 3: Two children — replace with inorder successor (smallest in right subtree) or predecessor.
Inorder traversal of BST gives sorted order.

6. BST PROBLEMS
- Validate BST: Each node must be in range (min, max). Root: (-inf, inf). Left: (min, root.val). Right: (root.val, max).
- Kth smallest: Inorder traversal, count to k. Or augment nodes with left subtree size.
- Floor/Ceil: Floor = largest value ≤ target. Ceil = smallest value ≥ target. Search and track.
- BST from preorder: Use range-based construction. Each value must be within (min, max).

7. AVL TREE (Self-balancing BST)
Balance factor = height(left) - height(right). Must be -1, 0, or 1.
Rotations to rebalance:
- Left-Left → Right rotation
- Right-Right → Left rotation
- Left-Right → Left rotation on left child, then right rotation
- Right-Left → Right rotation on right child, then left rotation
All operations: O(log n).

8. TREE CONSTRUCTION
- From inorder + preorder: Preorder first element is root. Find root in inorder. Left of root in inorder = left subtree. Right = right subtree.
- From inorder + postorder: Postorder last element is root. Same split logic.
- Cannot construct unique tree from preorder + postorder alone (except for full binary trees).

9. SERIALIZE / DESERIALIZE
Convert tree to string and back.
Preorder with null markers: "1,2,null,null,3,4,null,null,5,null,null".
Level order with nulls also works.
`
    },
    {
        name: "Heaps & Priority Queues",
        priority: 2,
        content: `
Heaps and Priority Queues

1. HEAP BASICS
A heap is a complete binary tree satisfying the heap property.
Max-heap: Parent ≥ children. Root = maximum.
Min-heap: Parent ≤ children. Root = minimum.
Array representation: For node at index i: Left child = 2i+1, Right child = 2i+2, Parent = (i-1)/2.

2. HEAP OPERATIONS
Insert (push): Add at end, bubble up (swap with parent while violating heap property). O(log n).
Extract (pop): Remove root, move last element to root, bubble down (swap with larger/smaller child). O(log n).
Peek: Return root. O(1).
Build heap: Start from last non-leaf ((n/2)-1), heapify each downward. O(n) — not O(n log n)!

3. PRIORITY QUEUE
Abstract data type: Insert with priority, extract highest priority element.
Implementation: Binary heap (most common), Fibonacci heap, binomial heap.
Java: PriorityQueue (min-heap by default). Use Comparator for max-heap.
Python: heapq module (min-heap). Negate values for max-heap.

4. KTHLARGEST/SMALLEST ELEMENT
Kth largest: Min-heap of size k. Process all elements — if element > heap top, replace. Heap top = kth largest.
Kth smallest: Max-heap of size k. Process all elements — if element < heap top, replace.
Alternative: Quickselect algorithm — average O(n), worst O(n²).
Time: O(n log k) with heap.

5. MERGE K SORTED LISTS
Min-heap of size k (one element from each list).
Extract min, add to result. Insert next element from extracted element's list.
Time: O(N log k) where N = total elements, k = number of lists.

6. TOP K FREQUENT ELEMENTS
Count frequencies using HashMap.
Min-heap of size k by frequency. Process all entries.
Alternative: Bucket sort — create buckets indexed by frequency. O(n).

7. MEDIAN FROM DATA STREAM
Two heaps: Max-heap for lower half, min-heap for upper half.
Balance: Sizes differ by at most 1.
AddNum: If num ≤ maxHeap.peek(), add to maxHeap. Else add to minHeap. Rebalance.
FindMedian: If equal sizes, average of both tops. Else top of larger heap.
Time: O(log n) per add, O(1) per find.

8. TASK SCHEDULER
Given tasks with cooldown period n. Find minimum time.
Greedy with max-heap: Always process most frequent task. Use queue for cooldown.
Formula: Time = max(totalTasks, (maxFreq - 1) * (n + 1) + countOfMaxFreq).

9. REORGANIZE STRING
Rearrange so no adjacent characters are same.
Max-heap by frequency. At each step, pick most frequent and second most frequent. Alternate.
Impossible if maxFreq > (n+1)/2.

10. K CLOSEST POINTS TO ORIGIN
Max-heap of size k. Distance = x² + y² (no need for sqrt).
Process all points — if distance < heap top, replace.
Time: O(n log k).
`
    },
    {
        name: "Graphs - BFS, DFS, Basics",
        priority: 3,
        content: `
Graphs - Fundamentals and Traversals

1. GRAPH REPRESENTATIONS
Adjacency Matrix: 2D array, matrix[i][j] = 1 if edge exists. Space: O(V²). Good for dense graphs.
Adjacency List: Array of lists, list[i] = neighbors of i. Space: O(V+E). Good for sparse graphs.
Edge List: List of (u, v, weight) tuples. Used in Kruskal's algorithm.

2. BFS (Breadth-First Search)
Uses queue. Visit level by level.
Algorithm: Enqueue source, mark visited. While queue not empty: dequeue u, process, enqueue unvisited neighbors.
Time: O(V+E). Space: O(V).
Properties: Finds shortest path in unweighted graph. Explores all nodes at distance d before d+1.
Applications: Shortest path, level-order traversal, connected components, bipartite check.

3. DFS (Depth-First Search)
Uses stack (or recursion). Go as deep as possible, then backtrack.
Algorithm: Mark source visited. For each unvisited neighbor, recurse.
Time: O(V+E). Space: O(V).
Properties: Explores one path completely before exploring another.
Applications: Cycle detection, topological sort, strongly connected components, path finding.

4. CONNECTED COMPONENTS
Undirected graph: Run BFS/DFS from each unvisited node. Each run discovers one component.
Number of components = number of BFS/DFS runs needed.

5. CYCLE DETECTION
Undirected graph: During DFS, if we visit an already-visited node that is NOT the parent, cycle exists.
BFS: If we encounter visited node that is not parent.
Directed graph: DFS with 3 states (unvisited, in-progress, done). Back edge to in-progress node = cycle.
BFS (Kahn's): If topological sort doesn't include all nodes, cycle exists.

6. BIPARTITE CHECK (Graph Coloring)
Can nodes be colored with 2 colors such that no adjacent nodes have same color?
BFS: Color source with 0. Color neighbors with 1. If neighbor already colored same as current, not bipartite.
Equivalent to: Graph has no odd-length cycle.

7. TOPOLOGICAL SORT (DAG only)
Linear ordering of vertices such that for edge u→v, u comes before v.
DFS method: After DFS(u) completes (all descendants processed), push u to stack. Reverse stack = topological order.
BFS method (Kahn's): Start with nodes having in-degree 0. Process and reduce neighbors' in-degree. Add new 0-degree nodes.
Time: O(V+E).

8. SHORTEST PATH - UNWEIGHTED
BFS from source. Distance array: dist[source] = 0. For each neighbor: dist[neighbor] = dist[current] + 1.

9. SHORTEST PATH - WEIGHTED (DIJKSTRA)
Single source shortest path for non-negative weights.
Min-heap priority queue. Start with (0, source).
Extract min distance node. Relax all edges: if dist[u] + weight(u,v) < dist[v], update.
Time: O((V+E) log V) with binary heap.
Does NOT work with negative weights.

10. BELLMAN-FORD
Single source shortest path, handles negative weights.
Relax all edges V-1 times. If any edge can be relaxed in Vth iteration, negative cycle exists.
Time: O(V*E).

11. FLOYD-WARSHALL
All-pairs shortest path. DP on intermediate vertices.
dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]) for each intermediate k.
Time: O(V³). Space: O(V²).

12. MST - KRUSKAL'S
Sort edges by weight. Add edges that don't create a cycle (use Union-Find).
Time: O(E log E).

13. MST - PRIM'S
Start from any vertex. Always add nearest unvisited vertex.
Use min-heap with (weight, vertex). Similar to Dijkstra.
Time: O(E log V).
`
    },
    {
        name: "Dynamic Programming - Basics",
        priority: 3,
        content: `
Dynamic Programming - Fundamentals and Patterns

1. WHAT IS DP
DP = Recursion + Memoization (top-down) or Tabulation (bottom-up).
Two properties required:
- Optimal substructure: Optimal solution contains optimal solutions to subproblems.
- Overlapping subproblems: Same subproblems are solved multiple times.

2. FIBONACCI (Classic DP)
Recursive: fib(n) = fib(n-1) + fib(n-2). O(2^n) without memoization.
Top-down: memo[n] = fib(n-1) + fib(n-2). O(n) time, O(n) space.
Bottom-up: dp[i] = dp[i-1] + dp[i-2]. O(n) time, O(n) space.
Space optimized: Only need last 2 values. O(1) space.

3. CLIMBING STAIRS
Ways to reach step n with 1 or 2 steps at a time.
dp[i] = dp[i-1] + dp[i-2]. Same as Fibonacci!
Variant: k steps allowed → dp[i] = sum of dp[i-1] to dp[i-k].

4. 0/1 KNAPSACK
Items with weight and value. Maximize value within capacity W.
2D: dp[i][w] = max(dp[i-1][w], dp[i-1][w-wt[i]] + val[i]).
1D optimization: dp[w] = max(dp[w], dp[w-wt[i]] + val[i]). Process w from W to 0 (right to left).
Time: O(n*W). Space: O(W).

5. UNBOUNDED KNAPSACK
Each item can be used unlimited times.
dp[w] = max over all items: dp[w-wt[i]] + val[i].
Process w from 0 to W (left to right — allows reuse).
Variants: Coin change (min coins), rod cutting.

6. LONGEST COMMON SUBSEQUENCE (LCS)
Two strings. Find longest subsequence common to both.
If s1[i] == s2[j]: dp[i][j] = dp[i-1][j-1] + 1.
Else: dp[i][j] = max(dp[i-1][j], dp[i][j-1]).
Time: O(n*m). To print LCS: backtrack from dp[n][m].

7. LONGEST INCREASING SUBSEQUENCE (LIS)
dp[i] = length of LIS ending at index i.
dp[i] = max(dp[j] + 1) for all j < i where arr[j] < arr[i].
Time: O(n²).
Optimized: Patience sorting with binary search. Maintain tails array. O(n log n).

8. EDIT DISTANCE
Transform string s1 to s2 using insert, delete, replace.
If s1[i] == s2[j]: dp[i][j] = dp[i-1][j-1].
Else: dp[i][j] = 1 + min(dp[i-1][j], dp[i][j-1], dp[i-1][j-1]). (delete, insert, replace).
Time: O(n*m).

9. COIN CHANGE
Minimum coins to make amount. Unbounded knapsack variant.
dp[amount] = min(dp[amount], dp[amount - coin] + 1) for each coin.
Initialize dp[0] = 0, rest = infinity.
If dp[amount] == infinity, not possible.

Number of ways: dp[amount] += dp[amount - coin]. Initialize dp[0] = 1.

10. MATRIX CHAIN MULTIPLICATION
Minimize cost of multiplying n matrices.
dp[i][j] = min cost to multiply matrices i to j.
dp[i][j] = min over k from i to j-1: dp[i][k] + dp[k+1][j] + dim[i]*dim[k+1]*dim[j+1].
Time: O(n³).
Pattern used in: Burst balloons, boolean parenthesization, palindrome partitioning min cuts.

11. GRID PATHS
Count paths from (0,0) to (m-1,n-1) moving right or down.
dp[i][j] = dp[i-1][j] + dp[i][j-1].
With obstacles: dp[i][j] = 0 if obstacle.
Minimum path sum: dp[i][j] = grid[i][j] + min(dp[i-1][j], dp[i][j-1]).

12. PARTITION PROBLEMS
Partition equal subset sum: Target = totalSum/2. Solve as 0/1 knapsack for target.
Minimum subset difference: Find all achievable sums up to totalSum/2. Result = totalSum - 2*closest.
Count subsets with given sum: dp[j] += dp[j - arr[i]].
`
    },
    {
        name: "Greedy Algorithms",
        priority: 2,
        content: `
Greedy Algorithms

1. GREEDY APPROACH
Make the locally optimal choice at each step, hoping to find global optimum.
Works when: Problem has greedy choice property and optimal substructure.
Greedy choice property: A globally optimal solution can be arrived at by making locally optimal choices.
Proof technique: Exchange argument — show any other solution can be transformed to greedy solution without worsening.

2. ACTIVITY SELECTION / MEETING ROOMS
Given intervals with start and end times, select maximum non-overlapping activities.
Sort by end time. Select first. For each next, if start ≥ last selected end, select it.
Time: O(n log n). Proof: Earliest finishing activity leaves maximum room for others.
Meeting rooms needed: Sort events (start/end). Sweep line, track concurrent meetings. Maximum = answer.

3. FRACTIONAL KNAPSACK
Items can be divided. Take fractions for maximum value.
Sort by value/weight ratio (descending). Take as much of highest ratio as possible.
Different from 0/1 knapsack — greedy works here because we can take fractions.

4. JOB SEQUENCING WITH DEADLINES
Jobs have deadlines and profits. Maximize profit by scheduling one job per time slot.
Sort by profit (descending). For each job, find latest available slot ≤ deadline. Assign.
Use Union-Find for O(n * α(n)) or simple slot array for O(n²).

5. HUFFMAN CODING
Build optimal prefix-free code for characters based on frequency.
Algorithm: Min-heap of frequencies. Extract two minimum, create parent with sum. Repeat.
Results in: Frequent characters get shorter codes, rare characters get longer codes.
Time: O(n log n). Used in: File compression (ZIP, JPEG).

6. MINIMUM PLATFORMS / MERGE INTERVALS
Merge overlapping intervals: Sort by start. If current overlaps with last merged, extend end. Else add new.
Minimum platforms: Sort arrivals and departures. Sweep line counting concurrent.

7. N MEETINGS IN ONE ROOM
Same as activity selection. Sort by end time. Greedily select non-overlapping.

8. ASSIGN COOKIES
Children have greed factor, cookies have size. Maximize satisfied children.
Sort both. Try to satisfy each child with smallest sufficient cookie. Two pointer approach.

9. JUMP GAME
Can you reach the last index? At each position, you can jump up to nums[i] steps.
Track maximum reachable index. If current index > maxReach, return false.
Jump Game II (minimum jumps): BFS-like approach. Track current range and farthest reachable.

10. GAS STATION
Circular route with gas stations. Find starting station to complete circuit.
If total gas ≥ total cost, solution exists.
Start from station where running sum first becomes positive after reset.
If running tank < 0, start from next station.

11. CANDY DISTRIBUTION
Each child must get at least 1. Higher-rated child gets more than neighbors.
Two passes: Left to right (compare with left neighbor). Right to left (compare with right neighbor).
Answer: max of both passes at each position. Sum all.
`
    },
    {
        name: "Hashing & HashMaps",
        priority: 2,
        content: `
Hashing and Hash Maps

1. HASH TABLE BASICS
Key-value store with O(1) average operations (insert, search, delete).
Hash function: Maps key to index in array. Good hash function: Uniform distribution, deterministic, fast.
Collision: Two keys map to same index. Unavoidable due to pigeonhole principle.

2. COLLISION HANDLING
Chaining: Each bucket stores a linked list/array of entries. Worst case O(n) if all collide.
Open addressing: Find next available slot.
  - Linear probing: Try index+1, index+2, ... Problem: Clustering.
  - Quadratic probing: Try index+1², index+2², ... Reduces clustering.
  - Double hashing: Use second hash function for step size. Best distribution.

3. LOAD FACTOR
Load factor = n/m (elements/buckets). 
When load factor exceeds threshold (e.g., 0.75), resize (double buckets, rehash all entries).
Java HashMap: Default capacity 16, load factor 0.75. Resizes to 32 at 12 entries.

4. TWO SUM
For each element, check if complement (target - element) exists in map.
Single pass: Check map, then add current element. O(n) time, O(n) space.
Return indices. HashMap stores value → index.

5. GROUP ANAGRAMS
Group strings that are anagrams of each other.
Key: Sort each string (or compute character frequency). Same key = same group.
Map: sorted_string → list of original strings.
Time: O(n * k log k) where k = max string length. O(n * k) with frequency key.

6. LONGEST CONSECUTIVE SEQUENCE
Find length of longest consecutive sequence in unsorted array.
HashSet all elements. For each element, if element-1 not in set (it's a start), count forward.
Time: O(n) — each element processed at most twice.

7. SUBARRAY SUM EQUALS K
Count subarrays with sum = k.
Prefix sum + HashMap. Map stores prefixSum → count of occurrences.
At each position, check if (currentPrefixSum - k) exists in map.
Why it works: If prefixSum[j] - prefixSum[i] = k, then subarray(i+1, j) sums to k.
Time: O(n), Space: O(n).

8. CONTAINS DUPLICATE
Simple: HashSet, check if element already seen. O(n) time, O(n) space.
Within k distance: HashMap stores value → last index. Check if current index - stored index ≤ k.

9. FREQUENCY COUNT PATTERN
Count occurrences of each element.
Applications: Find majority element, top k frequent, first unique character, valid anagram.
Character frequency: Array of size 26 for lowercase letters (faster than HashMap).

10. INTERSECTION AND UNION
Intersection: HashSet of arr1. For each in arr2, check if in set.
Union: HashSet of both arrays. Size = union count.

11. DESIGN HASHMAP
Array of buckets. Each bucket = linked list of (key, value) pairs.
put(key, value): Hash key, find bucket, update or append.
get(key): Hash key, search bucket.
remove(key): Hash key, find and remove from bucket.
`
    },
    {
        name: "Strings - Algorithms",
        priority: 2,
        content: `
String Algorithms

1. STRING BASICS
Strings are immutable in Java/Python (new string created on modification).
StringBuilder/StringBuffer for efficient concatenation in Java.
ASCII: 'a'=97, 'A'=65, '0'=48.

2. PALINDROME CHECK
Two pointers: left=0, right=n-1. Compare and move inward.
Case-insensitive: Convert to lowercase, skip non-alphanumeric.
Longest palindromic substring: Expand around center. Try each position as center (odd and even length). O(n²).
Manacher's algorithm: O(n) for longest palindromic substring.

3. KMP (Knuth-Morris-Pratt)
Pattern matching in O(n+m) time.
Failure function (LPS array): lps[i] = length of longest proper prefix of pattern[0..i] that is also a suffix.
Building LPS: Two pointers — i scans pattern, j tracks prefix length.
Searching: Compare text[i] with pattern[j]. Match: advance both. Mismatch: j = lps[j-1] (no backtracking on i).

4. RABIN-KARP
Rolling hash pattern matching. Hash window of pattern size, slide.
Hash function: Treat string as base-d number mod p. Remove leading char, add trailing char.
Average O(n+m), worst O(nm) if many hash collisions.
Used for: Multiple pattern matching, plagiarism detection.

5. Z-ALGORITHM
Z[i] = length of longest substring starting at i that matches a prefix of the string.
Create string: pattern + '$' + text. Z values ≥ pattern length indicate matches.
Time: O(n+m).

6. ANAGRAM PROBLEMS
Two strings are anagrams if character frequencies are identical.
Check: Sort both and compare O(n log n), or compare frequency arrays O(n).
Find anagrams in string: Sliding window of pattern length, compare frequencies. O(n).

7. LONGEST SUBSTRING WITHOUT REPEATING
Sliding window with HashSet or HashMap (char → last index).
Expand right. If duplicate, move left past the duplicate's previous position.
Time: O(n).

8. STRING COMPRESSION
"aabcccccccaaa" → "a2b1c7a3".
Two pointers: One reads, one writes. Count consecutive same characters.
If compressed length ≥ original, return original.

9. ATOI (String to Integer)
Handle: Leading whitespace, +/- sign, digits, overflow.
Process digit by digit: result = result * 10 + digit.
Check overflow before adding: if result > MAX/10 or (result == MAX/10 and digit > 7).

10. TRIE (Prefix Tree)
Node: children[26] (for a-z) + isEnd flag.
Insert: Walk down creating nodes as needed. Mark last as isEnd.
Search: Walk down. Return isEnd at last character.
StartsWith: Walk down. Return true if path exists.
Time: O(L) for insert/search where L = word length.
Applications: Autocomplete, spell checker, IP routing, word search in grid.

11. SUFFIX ARRAY
Array of all suffixes sorted lexicographically. Stores starting indices.
Construction: O(n log²n) with sorting, O(n) with SA-IS algorithm.
Used with LCP (Longest Common Prefix) array for: Longest repeated substring, number of distinct substrings.
`
    },
    {
        name: "Bit Manipulation",
        priority: 1,
        content: `
Bit Manipulation

1. BASIC OPERATIONS
AND (&): Both bits 1 → 1. Used for masking (checking if bit is set).
OR (|): Either bit 1 → 1. Used for setting bits.
XOR (^): Different bits → 1. Same bits → 0. Properties: a^a=0, a^0=a, commutative, associative.
NOT (~): Flip all bits. ~n = -(n+1).
Left shift (<<): Multiply by 2. n << k = n * 2^k.
Right shift (>>): Divide by 2. n >> k = n / 2^k.

2. COMMON TRICKS
Check if nth bit is set: (num >> n) & 1, or num & (1 << n).
Set nth bit: num | (1 << n).
Clear nth bit: num & ~(1 << n).
Toggle nth bit: num ^ (1 << n).
Check if power of 2: n > 0 && (n & (n-1)) == 0. Why? Power of 2 has exactly one bit set.
Count set bits (Brian Kernighan's): While n > 0: n = n & (n-1), count++. Each step removes lowest set bit.

3. XOR PROBLEMS
Single number: All elements appear twice except one. XOR all → result is the single number.
Two single numbers: XOR all gives a^b. Find any set bit (rightmost: diff & -diff). Partition numbers by that bit. XOR each group.
Missing number: XOR indices 0 to n and all elements. Result = missing number.

4. SUBSETS USING BITMASK
For array of n elements, iterate from 0 to 2^n - 1.
For each number mask, if bit j is set, include arr[j] in subset.
Total subsets: 2^n.

5. BIT DP
Use bitmask to represent state of selected/visited items.
Example: Traveling Salesman Problem.
dp[mask][i] = min cost to visit set of cities (represented by mask) ending at city i.
Transition: dp[mask | (1<<j)][j] = min(dp[mask][i] + cost[i][j]).
Time: O(2^n * n²).

6. DIVIDE AND MULTIPLY WITHOUT OPERATORS
Multiply by 2: n << 1.
Divide by 2: n >> 1.
Multiply a * b: Add a to itself b times using shifts: if bit k of b is set, add a << k.

7. SWAP WITHOUT TEMP
a = a ^ b; b = a ^ b; a = a ^ b;
After: a has original b, b has original a.

8. FIND TWO NON-REPEATING ELEMENTS
XOR all elements: result = a ^ b.
Find rightmost set bit: bit = result & (-result).
Split elements into two groups. XOR each group separately.

9. REVERSE BITS
Swap bits pairwise, then nibbles, then bytes.
Or iteratively: For each of 32 bits, shift result left and add rightmost bit of input.

10. IMPORTANT FORMULAS
Number of bits to represent n: floor(log2(n)) + 1.
Lowest set bit: n & (-n). Used in Binary Indexed Tree (Fenwick Tree).
Remove lowest set bit: n & (n-1).
Check all bits set: (n & (n+1)) == 0.
`
    },
];

async function seed() {
    // Topics belong to a user, so the seed needs an existing account to attach them to
    const email = process.env.SEED_USER_EMAIL?.trim().toLowerCase();
    if (!email) throw new Error('Set SEED_USER_EMAIL to the email of the account that should own the DSA topics');
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
    if (!user) throw new Error(`No account with email ${email}. Sign up in the app first.`);

    console.log(`🌱 Seeding DSA topics for ${email}...\n`);

    for (const topic of DSA_TOPICS) {
        // Check if topic already exists
        const existing = await prisma.topic.findFirst({
            where: { name: topic.name, userId: user.id },
        });

        if (existing) {
            console.log(`  ⏭️  "${topic.name}" already exists, skipping`);
            continue;
        }

        await prisma.topic.create({
            data: {
                name: topic.name,
                content: topic.content.trim(),
                priority: topic.priority,
                userId: user.id,
            },
        });
        console.log(`  ✅ Created: "${topic.name}" (Priority: ${topic.priority === 3 ? 'HIGH' : topic.priority === 2 ? 'NORMAL' : 'LOW'})`);
    }

    console.log(`\n🎉 Done! ${DSA_TOPICS.length} DSA topics seeded.`);
    console.log('👉 Now go to /daily and start revising!\n');
}

seed()
    .catch(e => { console.error('Error seeding:', e); process.exit(1); })
    .finally(() => prisma.$disconnect());
